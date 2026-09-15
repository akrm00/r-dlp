//! Opt-in checks using an actual installed engine and a caller-supplied public URL.
use super::{
    download_registry::DownloadRegistry,
    download_runner::run_download,
    execution::{build_plan, execute},
    runtime::RuntimeCatalog,
    settings::AppSettings,
    ytdlp,
};

#[tokio::test]
#[ignore = "requires yt-dlp, ffprobe and RDLP_SMOKE_URL; downloads into a temporary directory"]
async fn public_video_download() {
    let url = std::env::var("RDLP_SMOKE_URL").expect("set RDLP_SMOKE_URL to a public video");
    let catalog = RuntimeCatalog::default();
    let runtimes = catalog.runtimes().await;
    for runtime in &runtimes {
        eprintln!(
            "{}: version {:?}, browsers {:?}",
            runtime.id, runtime.version, runtime.browsers
        );
    }
    let mut settings = AppSettings::default();
    if std::env::var("RDLP_SMOKE_IMPERSONATE").is_ok() {
        settings.impersonation.mode = super::settings::ImpersonationMode::Always;
    }
    let plan = build_plan(&settings, &url, &runtimes, None).unwrap();
    let video = ytdlp::analyze(&url, &plan, |progress| eprintln!("analysis: {progress:?}"))
        .await
        .expect("analyze video");
    let context = video.execution_context.as_ref().unwrap();
    eprintln!("analysis context: {context:?}");
    let format = video
        .formats
        .iter()
        .filter(|format| format.has_audio && format.has_video)
        .min_by_key(|format| format.filesize.unwrap_or(i64::MAX));
    // Direct media URLs may omit codec metadata; yt-dlp's best selector still works.
    let format_id = format
        .map(|format| format.format_id.as_str())
        .unwrap_or("best");
    let extension = format
        .map(|format| format.extension.as_str())
        .unwrap_or("mp4");
    let plan = build_plan(&settings, &url, &runtimes, Some(context)).unwrap();
    let filename = ytdlp::get_filename(&url, format_id, &plan)
        .await
        .expect("get filename");
    assert_eq!(filename.execution_context, *context);
    let registry = DownloadRegistry::new();
    let receiver = registry.register("smoke").await;
    let directory = tempfile::tempdir().unwrap();
    let output = directory.path().join(format!("video.{extension}"));
    let result = execute(
        &plan,
        |context, _| eprintln!("download: {context:?}"),
        |attempt| {
            let mut receiver = receiver.clone();
            let output = &output;
            let url = &url;
            async move {
                run_download(
                    &attempt,
                    url,
                    format_id,
                    output,
                    "smoke",
                    &mut receiver,
                    |_| {},
                )
                .await
            }
        },
    )
    .await
    .expect("download video");
    assert_eq!(result.0, crate::types::DownloadOutcome::Completed);
    assert!(std::fs::metadata(&output).unwrap().len() > 0);
    let mut probe = ytdlp::create_command("ffprobe");
    probe
        .args([
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type",
            "-of",
            "json",
        ])
        .arg(&output);
    let result = super::runtime::capture(probe, std::time::Duration::from_secs(10))
        .await
        .expect("run ffprobe");
    assert!(
        result.status.success(),
        "downloaded video must be readable by ffprobe"
    );
    let streams: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert!(streams["streams"]
        .as_array()
        .unwrap()
        .iter()
        .any(|stream| stream["codec_type"] == "video"));
}
