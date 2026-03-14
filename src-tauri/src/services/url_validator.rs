use thiserror::Error;
use url::Url;

const MAX_URL_LENGTH: usize = 2048;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("URL is required")]
    Empty,
    #[error("URL exceeds maximum length of {MAX_URL_LENGTH} characters")]
    TooLong,
    #[error("Invalid URL format: {0}")]
    InvalidFormat(String),
    #[error("Only HTTP and HTTPS URLs are supported")]
    InvalidProtocol,
    #[error("Private/internal URLs are not allowed")]
    PrivateUrl,
}

pub fn validate_url(raw: &str) -> Result<String, ValidationError> {
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return Err(ValidationError::Empty);
    }

    if trimmed.len() > MAX_URL_LENGTH {
        return Err(ValidationError::TooLong);
    }

    let parsed =
        Url::parse(trimmed).map_err(|e| ValidationError::InvalidFormat(e.to_string()))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(ValidationError::InvalidProtocol);
    }

    let hostname = parsed.host_str().unwrap_or("");
    if is_private_host(hostname) {
        return Err(ValidationError::PrivateUrl);
    }

    Ok(parsed.to_string())
}

fn is_private_host(hostname: &str) -> bool {
    let lower = hostname.to_lowercase();

    if lower == "localhost" || lower == "::1" {
        return true;
    }

    // IPv4 private ranges
    let private_prefixes = [
        "127.", "10.", "0.", "169.254.", "192.168.",
    ];
    if private_prefixes.iter().any(|p| lower.starts_with(p)) {
        return true;
    }

    // 172.16.0.0/12
    if lower.starts_with("172.") {
        if let Some(second_octet) = lower.split('.').nth(1) {
            if let Ok(n) = second_octet.parse::<u8>() {
                if (16..=31).contains(&n) {
                    return true;
                }
            }
        }
    }

    // IPv6 private
    let ipv6_prefixes = ["fc00:", "fd", "fe80:"];
    if ipv6_prefixes.iter().any(|p| lower.starts_with(p)) {
        return true;
    }

    false
}
