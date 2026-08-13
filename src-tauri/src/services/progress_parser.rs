//! Parsing of the machine-readable progress lines emitted by yt-dlp.
//!
//! yt-dlp is started with `--newline --progress` plus the two `--progress-template`
//! flags below, so every progress tick arrives as one self-contained line prefixed
//! with a marker we can recognise among the rest of yt-dlp's output.

use crate::types::{DownloadProgress, DownloadStage};

const DOWNLOAD_MARKER: &str = "[rdlp]";
const POSTPROCESS_MARKER: &str = "[rdlp-pp]";

/// Progress template for the download phase (pipe-separated, order matters).
pub const DOWNLOAD_TEMPLATE: &str = concat!(
    "download:[rdlp]",
    "%(progress.status)s|",
    "%(progress.downloaded_bytes)s|",
    "%(progress.total_bytes)s|",
    "%(progress.total_bytes_estimate)s|",
    "%(progress.speed)s|",
    "%(progress.eta)s|",
    "%(progress.fragment_index)s|",
    "%(progress.fragment_count)s"
);

/// Progress template for the post-processing phase (merge, remux, extract audio).
pub const POSTPROCESS_TEMPLATE: &str = "postprocess:[rdlp-pp]%(progress.status)s";

/// Parse one line of yt-dlp output.
///
/// Returns `None` for every line that is not one of our progress lines, which is
/// the vast majority of yt-dlp's output.
pub fn parse_progress_line(line: &str, download_id: &str) -> Option<DownloadProgress> {
    let line = line.trim_end_matches(['\r', '\n']);

    // Every post-processing status (started, processing, finished) maps to the same
    // stage: the UI only needs to know the transfer is over and yt-dlp is still busy.
    if line.contains(POSTPROCESS_MARKER) {
        return Some(empty_progress(download_id, DownloadStage::Processing));
    }

    let index = line.find(DOWNLOAD_MARKER)?;
    let payload = &line[index + DOWNLOAD_MARKER.len()..];

    let mut fields = payload.split('|');
    let status = fields.next()?;

    // A short or malformed line still yields whatever fields did arrive.
    let downloaded_bytes = fields.next().and_then(parse_u64);
    let total_bytes = fields.next().and_then(parse_u64);
    let total_bytes_estimate = fields.next().and_then(parse_u64);
    let speed_bytes_per_sec = fields.next().and_then(parse_f64);
    let eta_seconds = fields.next().and_then(parse_u64);
    let fragment_index = fields.next().and_then(parse_u32);
    let fragment_count = fields.next().and_then(parse_u32);

    let stage = if status.trim() == "finished" {
        DownloadStage::Finished
    } else {
        DownloadStage::Downloading
    };

    Some(DownloadProgress {
        download_id: download_id.to_string(),
        stage,
        downloaded_bytes,
        total_bytes: total_bytes.or(total_bytes_estimate),
        speed_bytes_per_sec,
        eta_seconds,
        fragment_index,
        fragment_count,
    })
}

/// A progress update carrying only a stage change (no numbers available).
pub fn empty_progress(download_id: &str, stage: DownloadStage) -> DownloadProgress {
    DownloadProgress {
        download_id: download_id.to_string(),
        stage,
        downloaded_bytes: None,
        total_bytes: None,
        speed_bytes_per_sec: None,
        eta_seconds: None,
        fragment_index: None,
        fragment_count: None,
    }
}

/// yt-dlp renders unknown template values as `NA`.
fn parse_field(raw: &str) -> Option<&str> {
    let value = raw.trim();
    if value.is_empty() || value == "NA" || value == "None" {
        return None;
    }
    Some(value)
}

fn parse_f64(raw: &str) -> Option<f64> {
    parse_field(raw)?.parse::<f64>().ok().filter(|v| v.is_finite())
}

/// Byte counts are integers, but yt-dlp occasionally renders them as floats.
fn parse_u64(raw: &str) -> Option<u64> {
    let value = parse_field(raw)?;
    if let Ok(parsed) = value.parse::<u64>() {
        return Some(parsed);
    }
    let parsed = value.parse::<f64>().ok()?;
    if parsed.is_finite() && parsed >= 0.0 {
        Some(parsed as u64)
    } else {
        None
    }
}

fn parse_u32(raw: &str) -> Option<u32> {
    parse_u64(raw).map(|value| value.min(u32::MAX as u64) as u32)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "abc-123";

    #[test]
    fn parses_a_full_download_line() {
        let line = "[rdlp]downloading|1048576|10485760|10485760|524288.5|18|3|120";

        let progress = parse_progress_line(line, ID).expect("line should parse");

        assert_eq!(progress.download_id, ID);
        assert_eq!(progress.stage, DownloadStage::Downloading);
        assert_eq!(progress.downloaded_bytes, Some(1_048_576));
        assert_eq!(progress.total_bytes, Some(10_485_760));
        assert_eq!(progress.speed_bytes_per_sec, Some(524_288.5));
        assert_eq!(progress.eta_seconds, Some(18));
        assert_eq!(progress.fragment_index, Some(3));
        assert_eq!(progress.fragment_count, Some(120));
    }

    #[test]
    fn treats_na_fields_as_unknown() {
        let line = "[rdlp]downloading|NA|NA|NA|NA|NA|NA|NA";

        let progress = parse_progress_line(line, ID).expect("line should parse");

        assert_eq!(progress.stage, DownloadStage::Downloading);
        assert_eq!(progress.downloaded_bytes, None);
        assert_eq!(progress.total_bytes, None);
        assert_eq!(progress.speed_bytes_per_sec, None);
        assert_eq!(progress.eta_seconds, None);
        assert_eq!(progress.fragment_index, None);
        assert_eq!(progress.fragment_count, None);
    }

    #[test]
    fn falls_back_to_the_size_estimate() {
        let line = "[rdlp]downloading|500|NA|4096|NA|NA|NA|NA";

        let progress = parse_progress_line(line, ID).expect("line should parse");

        assert_eq!(progress.total_bytes, Some(4096));
    }

    #[test]
    fn maps_the_finished_status_to_the_finished_stage() {
        let line = "[rdlp]finished|10485760|10485760|10485760|NA|NA|NA|NA";

        let progress = parse_progress_line(line, ID).expect("line should parse");

        assert_eq!(progress.stage, DownloadStage::Finished);
        assert_eq!(progress.downloaded_bytes, Some(10_485_760));
    }

    #[test]
    fn maps_the_postprocess_line_to_the_processing_stage() {
        let progress =
            parse_progress_line("[rdlp-pp]started", ID).expect("line should parse");

        assert_eq!(progress.stage, DownloadStage::Processing);
        assert_eq!(progress.downloaded_bytes, None);
    }

    #[test]
    fn tolerates_a_truncated_line() {
        let progress =
            parse_progress_line("[rdlp]downloading|2048", ID).expect("line should parse");

        assert_eq!(progress.downloaded_bytes, Some(2048));
        assert_eq!(progress.total_bytes, None);
        assert_eq!(progress.eta_seconds, None);
    }

    #[test]
    fn tolerates_a_trailing_carriage_return() {
        let progress = parse_progress_line("[rdlp]downloading|2048|4096|NA|NA|NA|NA|NA\r", ID)
            .expect("line should parse");

        assert_eq!(progress.total_bytes, Some(4096));
    }

    #[test]
    fn parses_float_byte_counts() {
        let progress = parse_progress_line("[rdlp]downloading|2048.0|4096.9|NA|NA|NA|NA|NA", ID)
            .expect("line should parse");

        assert_eq!(progress.downloaded_bytes, Some(2048));
        assert_eq!(progress.total_bytes, Some(4096));
    }

    #[test]
    fn ignores_regular_yt_dlp_output() {
        assert!(parse_progress_line("[youtube] Extracting URL: https://x.test", ID).is_none());
        assert!(parse_progress_line("ERROR: Video unavailable", ID).is_none());
        assert!(parse_progress_line("", ID).is_none());
    }
}
