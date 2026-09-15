//! Discover existing yt-dlp installations without changing the user's environment.
use anyhow::{bail, Context, Result};
use serde::Serialize;
use std::{collections::BTreeSet, process::Output, time::Duration};
use tokio::{process::Command, sync::Mutex};

use super::{ytdlp::create_command, ytdlp_setup};

#[derive(Clone, Debug)]
pub struct Runtime {
    pub id: String,
    pub label: String,
    pub program: String,
    pub prefix: Vec<String>,
    pub version: Option<String>,
    pub browsers: Vec<String>,
    pub error: Option<String>,
}

impl Runtime {
    pub fn command(&self) -> Command {
        let mut command = create_command(&self.program);
        command
            .args(&self.prefix)
            .args(["--ignore-config", "--no-colors"])
            .stdin(std::process::Stdio::null())
            .kill_on_drop(true);
        command
    }

    pub fn supports(&self, browser: &str) -> bool {
        self.version.is_some() && self.browsers.iter().any(|value| value == browser)
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCapabilities {
    pub id: String,
    pub label: String,
    pub version: Option<String>,
    pub browsers: Vec<String>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct ImpersonationCapabilities {
    pub runtimes: Vec<RuntimeCapabilities>,
}

#[derive(Default)]
pub struct RuntimeCatalog {
    cached: Mutex<Option<Vec<Runtime>>>,
}

impl RuntimeCatalog {
    pub async fn runtimes(&self) -> Vec<Runtime> {
        let mut cached = self.cached.lock().await;
        if let Some(runtimes) = &*cached {
            return runtimes.clone();
        }
        let mut probes = tokio::task::JoinSet::new();
        for (index, runtime) in candidates().await.into_iter().enumerate() {
            probes.spawn(async move { (index, probe(runtime).await) });
        }
        let mut results = Vec::new();
        while let Some(Ok(result)) = probes.join_next().await {
            results.push(result);
        }
        results.sort_by_key(|(index, _)| *index);
        let runtimes: Vec<_> = results.into_iter().map(|(_, runtime)| runtime).collect();
        *cached = Some(runtimes.clone());
        runtimes
    }

    pub async fn invalidate(&self) {
        *self.cached.lock().await = None;
    }

    pub async fn capabilities(&self, refresh: bool) -> ImpersonationCapabilities {
        if refresh {
            self.invalidate().await;
        }
        ImpersonationCapabilities {
            runtimes: self
                .runtimes()
                .await
                .into_iter()
                .map(|runtime| RuntimeCapabilities {
                    id: runtime.id,
                    label: runtime.label,
                    version: runtime.version,
                    browsers: runtime.browsers,
                    error: runtime.error,
                })
                .collect(),
        }
    }
}

fn candidate(id: &str, label: &str, program: String, prefix: &[&str]) -> Runtime {
    Runtime {
        id: id.into(),
        label: label.into(),
        program,
        prefix: prefix.iter().map(|arg| (*arg).into()).collect(),
        version: None,
        browsers: Vec::new(),
        error: None,
    }
}

async fn candidates() -> Vec<Runtime> {
    let mut runtimes = Vec::new();
    if let Some(path) = ytdlp_setup::get_local_binary_path().filter(|path| path.exists()) {
        runtimes.push(candidate(
            "managed",
            "App installation",
            path.to_string_lossy().into(),
            &[],
        ));
    }
    runtimes.push(candidate(
        "system",
        "System yt-dlp",
        if cfg!(windows) {
            "yt-dlp.exe"
        } else {
            "yt-dlp"
        }
        .into(),
        &[],
    ));
    if cfg!(windows) {
        runtimes.push(candidate(
            "py",
            "Python launcher (py)",
            "py".into(),
            &["-m", "yt_dlp"],
        ));
    }
    runtimes.push(candidate(
        "python3",
        "Python 3",
        "python3".into(),
        &["-m", "yt_dlp"],
    ));
    runtimes.push(candidate(
        "python",
        "Python",
        "python".into(),
        &["-m", "yt_dlp"],
    ));
    if cfg!(windows) {
        let mut command = create_command("py");
        command
            .arg("--list-paths")
            .stdin(std::process::Stdio::null());
        if let Ok(output) = capture(command, Duration::from_secs(10)).await {
            if output.status.success() {
                for selector in parse_python_selectors(&String::from_utf8_lossy(&output.stdout)) {
                    let version = selector.trim_start_matches("-V:").trim_start_matches('-');
                    runtimes.push(candidate(
                        &format!("py:{version}"),
                        &format!("Python {version}"),
                        "py".into(),
                        &[&selector, "-m", "yt_dlp"],
                    ));
                }
            }
        }
    }
    runtimes
}

fn parse_python_selectors(output: &str) -> Vec<String> {
    let mut selectors = Vec::new();
    for line in output.lines() {
        let Some(selector) = line.split_whitespace().next() else {
            continue;
        };
        let Some(version) = selector
            .strip_prefix("-V:")
            .or_else(|| selector.strip_prefix('-'))
        else {
            continue;
        };
        if version.starts_with(|c: char| c.is_ascii_digit())
            && version.contains('.')
            && version
                .chars()
                .all(|c| c.is_ascii_digit() || c == '.' || c == '-')
            && !selectors.iter().any(|value| value == selector)
        {
            selectors.push(selector.to_string());
        }
    }
    selectors
}

async fn probe(mut runtime: Runtime) -> Runtime {
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let result = async {
        let mut command = runtime.command();
        command.arg("--version");
        let output = capture(
            command,
            deadline.saturating_duration_since(std::time::Instant::now()),
        )
        .await
        .context("Installation could not be started")?;
        if !output.status.success() {
            bail!("yt-dlp is not available in this installation");
        }
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if version.is_empty() {
            bail!("Installation returned no version");
        }
        runtime.version = Some(version);
        let mut command = runtime.command();
        command.arg("--list-impersonate-targets");
        let output = capture(
            command,
            deadline.saturating_duration_since(std::time::Instant::now()),
        )
        .await
        .context("Could not detect browser profiles")?;
        if !output.status.success() {
            bail!("This installation cannot list browser profiles");
        }
        runtime.browsers = parse_browsers(&String::from_utf8_lossy(&output.stdout));
        if runtime.browsers.is_empty() {
            runtime.error =
                Some("No browser profiles available (curl_cffi is missing or unsupported)".into());
        }
        Ok::<_, anyhow::Error>(())
    }
    .await;
    match result {
        Err(error) => runtime.error = Some(error.to_string()),
        Ok(()) => {}
    }
    runtime
}

/// The CLI emits a table, including placeholder rows for *unavailable* clients.
fn parse_browsers(output: &str) -> Vec<String> {
    let mut browsers = BTreeSet::new();
    for line in output.lines() {
        let columns: Vec<_> = line.split_whitespace().collect();
        if columns.len() != 3 || columns[2] != "curl_cffi" {
            continue;
        }
        let browser = columns[0]
            .split('-')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if !browser.is_empty() && browser.chars().all(|c| c.is_ascii_lowercase()) {
            browsers.insert(browser);
        }
    }
    browsers.into_iter().collect()
}

/// Unlike dropping Command::output on timeout, this also reaps the killed child.
pub async fn capture(mut command: Command, timeout: Duration) -> Result<Output> {
    use tokio::io::AsyncReadExt;
    command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    command.kill_on_drop(true);
    let mut child = command.spawn().context("Failed to start yt-dlp")?;
    let mut stdout = child.stdout.take().context("Failed to capture stdout")?;
    let mut stderr = child.stderr.take().context("Failed to capture stderr")?;
    let stdout_task = tokio::spawn(async move {
        let mut bytes = Vec::new();
        stdout.read_to_end(&mut bytes).await.map(|_| bytes)
    });
    let stderr_task = tokio::spawn(async move {
        let mut bytes = Vec::new();
        stderr.read_to_end(&mut bytes).await.map(|_| bytes)
    });
    let status = tokio::time::timeout(timeout, child.wait()).await;
    if status.is_err() {
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
    let stdout = stdout_task.await??;
    let stderr = stderr_task.await??;
    let status = status.map_err(|_| super::request_error::RequestFailure::timeout())??;
    Ok(Output {
        status,
        stdout,
        stderr,
    })
}

#[cfg(test)]
pub(crate) mod test_support {
    use super::{Runtime, RuntimeCatalog};
    use tokio::sync::Mutex;

    pub(crate) fn catalog(runtimes: Vec<Runtime>) -> RuntimeCatalog {
        RuntimeCatalog {
            cached: Mutex::new(Some(runtimes)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unavailable_rows_never_become_browser_candidates() {
        let output = "[info] Available impersonate targets\nClient OS Source\n-----\nChrome - curl_cffi (unavailable)\nEdge-101 Windows-10 curl_cffi\nSafari-18.0 Macos-15 curl_cffi\nEdge-99 Windows-10 curl_cffi\n";
        assert_eq!(parse_browsers(output), vec!["edge", "safari"]);
    }

    #[test]
    fn empty_or_unknown_capability_output_is_not_supported() {
        assert!(parse_browsers("Usage: yt-dlp [OPTIONS]\nno such option").is_empty());
        assert!(parse_browsers("Chrome - curl_cffi (unavailable)").is_empty());
    }

    #[test]
    fn python_discovery_accepts_only_version_selectors_from_launcher_output() {
        let output = " -V:3.14 * C:\\Python314\\python.exe\n -V:3.13 C:\\Python313\\python.exe\n -3.12-64 C:\\Python312\\python.exe\n -V:evil.exe C:\\other.exe\n";
        assert_eq!(
            parse_python_selectors(output),
            vec!["-V:3.14", "-V:3.13", "-3.12-64"]
        );
    }
}
