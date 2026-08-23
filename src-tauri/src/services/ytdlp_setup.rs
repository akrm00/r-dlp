use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::types::UpdateCheckResult;

use super::ytdlp::create_command;

const UPDATE_CACHE_TTL_SECS: u64 = 24 * 60 * 60;

/// Get the directory where the local yt-dlp binary is stored.
fn get_install_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("r-dlp").join("bin"))
}

/// Get the full path of the locally installed yt-dlp binary.
pub fn get_local_binary_path() -> Option<PathBuf> {
    let binary_name = if cfg!(windows) {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };
    get_install_dir().map(|d| d.join(binary_name))
}

/// Check if yt-dlp is available (locally installed or in system PATH).
///
/// The last element indicates whether the binary is the one r-dlp installs and can
/// therefore update automatically, as opposed to a binary found on the system PATH.
pub async fn check_installed() -> (bool, Option<String>, Option<String>, bool) {
    // Check local binary first
    if let Some(local_path) = get_local_binary_path() {
        if local_path.exists() {
            if let Ok(version) = get_version_at(&local_path).await {
                return (
                    true,
                    Some(version),
                    Some(local_path.to_string_lossy().to_string()),
                    true,
                );
            }
        }
    }

    // Check system PATH
    let system_binary = if cfg!(windows) {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };

    if let Ok(output) = create_command(system_binary).arg("--version").output().await {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, Some(version), Some(system_binary.to_string()), false);
        }
    }

    (false, None, None, false)
}

/// Download and install yt-dlp binary from GitHub releases.
pub async fn install() -> Result<String> {
    let install_dir = get_install_dir().context("Could not determine app data directory")?;
    std::fs::create_dir_all(&install_dir)
        .context("Failed to create installation directory")?;

    let binary_path = get_local_binary_path().context("Could not determine binary path")?;

    let download_url = get_download_url();

    let response = reqwest::get(download_url)
        .await
        .context("Failed to download yt-dlp")?;

    if !response.status().is_success() {
        bail!(
            "Download failed with status: {}",
            response.status()
        );
    }

    let bytes = response
        .bytes()
        .await
        .context("Failed to read download response")?;

    std::fs::write(&binary_path, &bytes).context("Failed to write yt-dlp binary")?;

    // Make executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&binary_path)?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&binary_path, perms)?;
    }

    // Verify installation
    let version = get_version_at(&binary_path)
        .await
        .context("yt-dlp was downloaded but failed to run")?;

    Ok(version)
}

/// Check whether a newer yt-dlp release is available.
///
/// Uses a 24h disk cache for the "latest release" lookup unless `force` is set, so the
/// GitHub API isn't hit on every app launch.
pub async fn check_for_update(force: bool) -> Result<UpdateCheckResult> {
    let (installed, current_version, _path, managed) = check_installed().await;

    if !installed {
        bail!("yt-dlp is not installed");
    }
    let current_version =
        current_version.context("Could not determine the current yt-dlp version")?;

    let cached = if force { None } else { read_cache() };

    let latest_version = match cached {
        Some(latest_version) => latest_version,
        None => {
            let tag = fetch_latest_release_tag().await?;
            write_cache(&tag);
            tag
        }
    };

    let update_available = managed && is_newer(&current_version, &latest_version);

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        update_available,
        managed,
    })
}

/// Update the locally managed yt-dlp binary to the latest release.
///
/// Tries yt-dlp's own self-updater (`-U`) first, which verifies the download's integrity
/// and knows how to replace a running binary on every platform. Falls back to a full
/// reinstall (redownloading the binary, like the initial `install()`) if that fails.
pub async fn update() -> Result<String> {
    let (installed, _current_version, _path, managed) = check_installed().await;

    if !installed {
        bail!("yt-dlp is not installed");
    }
    if !managed {
        bail!("This yt-dlp binary is managed outside of r-dlp and can't be updated automatically.");
    }

    let binary_path = get_local_binary_path().context("Could not determine binary path")?;

    let self_update_result = tokio::time::timeout(
        std::time::Duration::from_secs(60),
        create_command(&binary_path).arg("-U").output(),
    )
    .await;

    let self_update_ok = match &self_update_result {
        Ok(Ok(output)) => {
            let combined = format!(
                "{}{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
            output.status.success() && !combined.contains("Cannot update")
        }
        _ => false,
    };

    if !self_update_ok {
        install().await.context("Self-update failed and reinstall fallback also failed")?;
    }

    let version = get_version_at(&binary_path)
        .await
        .context("yt-dlp was updated but failed to run")?;

    write_cache(&version);

    Ok(version)
}

async fn get_version_at(path: &PathBuf) -> Result<String> {
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        create_command(path).arg("--version").output(),
    )
    .await
    .context("Version check timed out")?
    .context("Failed to run yt-dlp")?;

    if !output.status.success() {
        bail!("yt-dlp returned non-zero exit code");
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn get_download_url() -> &'static str {
    if cfg!(target_os = "windows") {
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    } else if cfg!(target_os = "macos") {
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    } else {
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
    }
}

#[derive(Debug, Deserialize)]
struct GithubReleaseResponse {
    tag_name: String,
}

async fn fetch_latest_release_tag() -> Result<String> {
    let client = reqwest::Client::new();

    let response = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        client
            .get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest")
            .header("User-Agent", "r-dlp")
            .send(),
    )
    .await
    .context("GitHub API request timed out")?
    .context("Failed to reach GitHub API")?;

    if !response.status().is_success() {
        bail!("GitHub API returned status: {}", response.status());
    }

    let parsed: GithubReleaseResponse = response
        .json()
        .await
        .context("Failed to parse GitHub API response")?;

    Ok(parsed.tag_name)
}

/// Parse a yt-dlp version string (`YYYY.MM.DD` or `YYYY.MM.DD.REV`) into comparable parts.
fn parse_version(version: &str) -> Vec<u32> {
    version
        .trim()
        .split('.')
        .map(|part| part.parse::<u32>().unwrap_or(0))
        .collect()
}

/// Whether `remote` is a newer version than `local`, comparing numerically component by
/// component rather than as raw strings (so `.2` vs `.10` compares correctly).
fn is_newer(local: &str, remote: &str) -> bool {
    parse_version(remote) > parse_version(local)
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateCache {
    checked_at_unix: u64,
    latest_version: String,
}

fn get_cache_path() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("r-dlp").join("update_check_cache.json"))
}

fn read_cache() -> Option<String> {
    let path = get_cache_path()?;
    let data = std::fs::read_to_string(path).ok()?;
    let cache: UpdateCache = serde_json::from_str(&data).ok()?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if now.saturating_sub(cache.checked_at_unix) < UPDATE_CACHE_TTL_SECS {
        Some(cache.latest_version)
    } else {
        None
    }
}

fn write_cache(latest_version: &str) {
    let Some(path) = get_cache_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let checked_at_unix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let cache = UpdateCache {
        checked_at_unix,
        latest_version: latest_version.to_string(),
    };

    if let Ok(json) = serde_json::to_string(&cache) {
        let _ = std::fs::write(path, json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn equal_versions_are_not_newer() {
        assert!(!is_newer("2024.08.06", "2024.08.06"));
    }

    #[test]
    fn newer_day_is_detected() {
        assert!(is_newer("2024.08.06", "2024.08.07"));
    }

    #[test]
    fn newer_month_is_detected() {
        assert!(is_newer("2024.08.06", "2024.09.01"));
    }

    #[test]
    fn newer_year_is_detected() {
        assert!(is_newer("2024.12.31", "2025.01.01"));
    }

    #[test]
    fn extra_revision_component_is_newer() {
        assert!(is_newer("2024.08.06", "2024.08.06.1"));
    }

    #[test]
    fn missing_revision_component_is_older() {
        assert!(!is_newer("2024.08.06.1", "2024.08.06"));
    }

    #[test]
    fn higher_revision_is_newer_even_with_more_digits() {
        assert!(is_newer("2024.08.06.2", "2024.08.06.10"));
    }

    #[test]
    fn older_version_is_not_newer() {
        assert!(!is_newer("2025.01.01", "2024.12.31"));
    }
}
