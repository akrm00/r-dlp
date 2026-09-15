use super::ytdlp::clean_error_message;

/// Keep the retry decision separate from the shortened user-facing message.
#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct RequestFailure {
    pub message: String,
    pub retryable: bool,
}

impl RequestFailure {
    pub fn from_stderr(stderr: &str) -> Self {
        let lower = stderr.to_ascii_lowercase();
        let terminal = [
            "unsupported url",
            "private video",
            "video unavailable",
            "has been removed",
            "video is not available",
            "video does not exist",
            "content is not available",
            "has been deleted",
            "sign in",
            "login required",
            "requires authentication",
            "not available in your country",
            "requested format is not available",
            "permission denied",
            "no space left",
            "disk full",
            "unable to open for writing",
            "access is denied",
            "unable to rename file",
            "unable to create directory",
            "unable to write",
            "postprocessing:",
            "ffmpeg not found",
            "ffprobe not found",
            "ffmpeg exited with code",
            "invalid argument",
        ]
        .iter()
        .any(|pattern| lower.contains(pattern));
        Self {
            message: clean_error_message(stderr),
            retryable: !terminal,
        }
    }

    pub fn timeout() -> Self {
        Self {
            message: "yt-dlp request timed out".into(),
            retryable: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retries_remote_failures_but_not_local_or_definitive_errors() {
        for message in [
            "HTTP Error 403: Forbidden",
            "Unable to extract webpage",
            "Connection reset",
            "timed out",
        ] {
            assert!(RequestFailure::from_stderr(message).retryable, "{message}");
        }
        for message in [
            "ERROR: Unsupported URL",
            "ERROR: Private video",
            "ERROR: Video unavailable",
            "ERROR: Sign in to confirm your age",
            "ERROR: unable to open for writing: Permission denied",
            "ERROR: Postprocessing: ffmpeg failed",
            "ERROR: Requested format is not available",
            "ERROR: Unable to rename file: Access is denied",
            "ERROR: This video is not available",
        ] {
            assert!(!RequestFailure::from_stderr(message).retryable, "{message}");
        }
    }
}
