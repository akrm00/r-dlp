use serde::{Deserialize, Serialize};

// Domain models sent to the frontend (camelCase for JS interop)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoFormat {
    pub format_id: String,
    pub label: String,
    pub extension: String,
    pub resolution: Option<String>,
    pub fps: Option<f64>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub audio_bitrate: Option<f64>,
    pub video_bitrate: Option<f64>,
    pub filesize: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub has_video: bool,
    pub has_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration_seconds: Option<f64>,
    pub duration_formatted: Option<String>,
    pub uploader: Option<String>,
    pub uploader_url: Option<String>,
    pub upload_date: Option<String>,
    pub view_count: Option<i64>,
    pub source_url: String,
    pub platform: String,
    pub formats: Vec<VideoFormat>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YtdlpStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

// yt-dlp raw JSON DTOs (snake_case matching yt-dlp output)

#[derive(Debug, Deserialize)]
pub struct YtDlpThumbnail {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct YtDlpFormatDTO {
    pub format_id: String,
    pub format_note: Option<String>,
    pub ext: String,
    pub resolution: Option<String>,
    pub fps: Option<f64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub abr: Option<f64>,
    pub vbr: Option<f64>,
    pub filesize: Option<i64>,
    pub filesize_approx: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct YtDlpInfoDTO {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub thumbnail: Option<String>,
    pub thumbnails: Option<Vec<YtDlpThumbnail>>,
    pub duration: Option<f64>,
    pub duration_string: Option<String>,
    pub uploader: Option<String>,
    pub uploader_url: Option<String>,
    pub upload_date: Option<String>,
    pub view_count: Option<i64>,
    pub webpage_url: String,
    pub extractor: String,
    pub extractor_key: Option<String>,
    pub formats: Option<Vec<YtDlpFormatDTO>>,
}

// Mappers

pub fn to_video_format(dto: YtDlpFormatDTO) -> VideoFormat {
    let vcodec = dto.vcodec.filter(|c| c != "none");
    let acodec = dto.acodec.filter(|c| c != "none");

    VideoFormat {
        format_id: dto.format_id.clone(),
        label: dto.format_note.unwrap_or(dto.format_id),
        extension: dto.ext,
        resolution: dto.resolution.filter(|r| r != "audio only"),
        fps: dto.fps,
        video_codec: vcodec.clone(),
        audio_codec: acodec.clone(),
        audio_bitrate: dto.abr,
        video_bitrate: dto.vbr,
        filesize: dto.filesize.or(dto.filesize_approx),
        width: dto.width,
        height: dto.height,
        has_video: vcodec.is_some(),
        has_audio: acodec.is_some(),
    }
}

pub fn to_video_info(dto: YtDlpInfoDTO) -> VideoInfo {
    let formats = dto
        .formats
        .unwrap_or_default()
        .into_iter()
        .map(to_video_format)
        .filter(|f| f.has_video || f.has_audio)
        .collect();

    let thumbnail_url = dto.thumbnail.or_else(|| {
        dto.thumbnails
            .and_then(|t| t.last().map(|thumb| thumb.url.clone()))
    });

    VideoInfo {
        id: dto.id,
        title: dto.title,
        description: dto.description,
        thumbnail_url,
        duration_seconds: dto.duration,
        duration_formatted: dto.duration_string,
        uploader: dto.uploader,
        uploader_url: dto.uploader_url,
        upload_date: dto.upload_date,
        view_count: dto.view_count,
        source_url: dto.webpage_url,
        platform: dto.extractor_key.unwrap_or(dto.extractor),
        formats,
    }
}
