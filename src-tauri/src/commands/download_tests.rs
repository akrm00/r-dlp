use super::run_queued_download;
use crate::services::download_registry::{DownloadRegistry, StopReason, MAX_CONCURRENT_DOWNLOADS};
use crate::services::runtime::{capture, test_support::catalog, Runtime};
use crate::services::settings::{ImpersonationMode, SettingsStore};
use crate::types::{DownloadOutcome, DownloadProgress};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::ipc::Channel;
use tokio::process::Command;

fn successful_runtime() -> Runtime {
    #[cfg(windows)]
    let (program, prefix) = (
        "powershell.exe".to_string(),
        vec![
            "-NoProfile".to_string(),
            "-NonInteractive".to_string(),
            "-Command".to_string(),
            "exit 0 #".to_string(),
        ],
    );
    #[cfg(not(windows))]
    let (program, prefix) = (
        "/bin/sh".to_string(),
        vec!["-c".to_string(), "exit 0".to_string()],
    );

    Runtime {
        id: "test".to_string(),
        label: "Test runtime".to_string(),
        program,
        prefix,
        version: Some("test".to_string()),
        browsers: vec!["chrome".to_string()],
        error: None,
    }
}

fn missing_runtime() -> Runtime {
    Runtime {
        program: "rdlp-test-executable-that-does-not-exist".to_string(),
        ..successful_runtime()
    }
}

fn discard_progress() -> Channel<DownloadProgress> {
    Channel::new(|_| Ok(()))
}

async fn occupy_all_slots(registry: &DownloadRegistry) -> Vec<tokio::sync::OwnedSemaphorePermit> {
    let mut permits = Vec::new();
    for _ in 0..MAX_CONCURRENT_DOWNLOADS {
        permits.push(
            registry
                .acquire_slot()
                .await
                .expect("slot should be available"),
        );
    }
    permits
}

#[tokio::test]
async fn queued_download_uses_settings_saved_while_it_waits_for_a_slot() {
    let directory = tempfile::tempdir().unwrap();
    let output_path = directory.path().join("video.mp4");
    let output = output_path.to_string_lossy().into_owned();
    let settings = SettingsStore::new(directory.path().join("settings.json"));
    let catalog = catalog(vec![successful_runtime()]);
    let registry = DownloadRegistry::new();
    let mut stop_rx = registry.register("queued-settings").await;
    let mut permits = occupy_all_slots(&registry).await;
    let mut queued = Box::pin(run_queued_download(
        &settings,
        &catalog,
        None,
        &registry,
        &mut stop_rx,
        "https://www.tiktok.com/watch?v=1",
        "best",
        &output,
        "queued-settings",
        discard_progress(),
    ));

    assert!(tokio::time::timeout(Duration::from_millis(30), &mut queued)
        .await
        .is_err());

    let mut changed = settings.get().unwrap();
    changed.impersonation.sites[0].mode = ImpersonationMode::Never;
    let saved = settings.update(changed).unwrap();
    drop(permits.pop());

    let result = tokio::time::timeout(Duration::from_secs(5), queued)
        .await
        .expect("fake process should finish")
        .unwrap();
    let context = result
        .execution_context
        .expect("completed download should return its context");
    assert_eq!(result.outcome, DownloadOutcome::Completed);
    assert_eq!(context.settings_revision, saved.revision);
    assert_eq!(context.browser, None);
}

#[tokio::test]
async fn cancelling_a_queued_download_never_starts_a_process() {
    let directory = tempfile::tempdir().unwrap();
    let output_path = directory.path().join("video.mp4");
    let output = output_path.to_string_lossy().into_owned();
    let settings = SettingsStore::new(directory.path().join("settings.json"));
    let catalog = catalog(vec![missing_runtime()]);
    let registry = DownloadRegistry::new();
    let mut stop_rx = registry.register("queued-cancel").await;
    let mut permits = occupy_all_slots(&registry).await;
    let event_count = Arc::new(AtomicUsize::new(0));
    let event_count_for_channel = Arc::clone(&event_count);
    let channel = Channel::new(move |_| {
        event_count_for_channel.fetch_add(1, Ordering::Relaxed);
        Ok(())
    });
    let mut queued = Box::pin(run_queued_download(
        &settings,
        &catalog,
        None,
        &registry,
        &mut stop_rx,
        "https://example.com/video",
        "best",
        &output,
        "queued-cancel",
        channel,
    ));

    assert!(tokio::time::timeout(Duration::from_millis(30), &mut queued)
        .await
        .is_err());
    assert!(registry.stop("queued-cancel", StopReason::Cancel).await);
    drop(permits.pop());

    let result = tokio::time::timeout(Duration::from_secs(1), queued)
        .await
        .expect("queued cancellation should finish promptly")
        .unwrap();
    assert_eq!(result.outcome, DownloadOutcome::Cancelled);
    assert_eq!(result.execution_context, None);
    assert_eq!(event_count.load(Ordering::Relaxed), 0);
}

#[tokio::test]
async fn capture_timeout_reaps_the_process_before_returning() {
    let directory = tempfile::tempdir().unwrap();
    let started = directory.path().join("started");
    let completed = directory.path().join("completed");
    let command = slow_command(&started, &completed);
    let before = Instant::now();
    let process_timeout = if cfg!(windows) {
        Duration::from_secs(2)
    } else {
        Duration::from_millis(200)
    };

    let error = tokio::time::timeout(Duration::from_secs(6), capture(command, process_timeout))
        .await
        .expect("capture must kill and reap a timed-out process")
        .unwrap_err();

    assert!(error.to_string().contains("timed out"));
    assert!(before.elapsed() < Duration::from_secs(6));
    assert!(started.exists(), "the fake process must have started");
    assert!(
        !completed.exists(),
        "work after the timeout must never execute"
    );
}

fn slow_command(started: &Path, completed: &Path) -> Command {
    #[cfg(windows)]
    {
        let mut command = Command::new("powershell.exe");
        command
            .env("RDLP_TEST_STARTED_PATH", started)
            .env("RDLP_TEST_COMPLETED_PATH", completed)
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "[IO.File]::WriteAllText($env:RDLP_TEST_STARTED_PATH, 'started'); Start-Sleep -Seconds 30; [IO.File]::WriteAllText($env:RDLP_TEST_COMPLETED_PATH, 'completed')",
            ]);
        command
    }
    #[cfg(not(windows))]
    {
        let mut command = Command::new("/bin/sh");
        command
            .env("RDLP_TEST_STARTED_PATH", started)
            .env("RDLP_TEST_COMPLETED_PATH", completed)
            .args([
                "-c",
                "printf started > \"$RDLP_TEST_STARTED_PATH\"; i=0; while [ \"$i\" -lt 1000000000 ]; do i=$((i + 1)); done; printf completed > \"$RDLP_TEST_COMPLETED_PATH\"",
            ]);
        command
    }
}
