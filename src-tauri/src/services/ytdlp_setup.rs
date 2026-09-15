use anyhow::{bail, Context, Result};
use std::path::PathBuf;

use super::ytdlp::create_command;

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

/// Download and install yt-dlp binary from GitHub releases.
pub async fn install() -> Result<String> {
    let install_dir = get_install_dir().context("Could not determine app data directory")?;
    std::fs::create_dir_all(&install_dir).context("Failed to create installation directory")?;

    let binary_path = get_local_binary_path().context("Could not determine binary path")?;

    let download_url = get_download_url();

    let response = reqwest::get(download_url)
        .await
        .context("Failed to download yt-dlp")?;

    if !response.status().is_success() {
        bail!("Download failed with status: {}", response.status());
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
