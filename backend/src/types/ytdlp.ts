// Raw yt-dlp --dump-json format shape (DTO)
export type YtDlpFormatDTO = {
  format_id: string;
  format_note?: string;
  ext: string;
  resolution?: string;
  fps?: number | null;
  vcodec?: string;
  acodec?: string;
  abr?: number | null;
  vbr?: number | null;
  tbr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  width?: number | null;
  height?: number | null;
  audio_ext?: string;
  video_ext?: string;
  protocol?: string;
};

// Raw yt-dlp --dump-json info shape (DTO)
export type YtDlpInfoDTO = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: number;
  duration_string?: string;
  uploader?: string;
  uploader_url?: string;
  upload_date?: string;
  view_count?: number;
  webpage_url: string;
  extractor: string;
  extractor_key?: string;
  formats?: YtDlpFormatDTO[];
};

// Clean domain models
export type VideoFormat = {
  formatId: string;
  label: string;
  extension: string;
  resolution: string | null;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  audioBitrate: number | null;
  videoBitrate: number | null;
  filesize: number | null;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
};

export type VideoInfo = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  durationFormatted: string | null;
  uploader: string | null;
  uploaderUrl: string | null;
  uploadDate: string | null;
  viewCount: number | null;
  sourceUrl: string;
  platform: string;
  formats: VideoFormat[];
};

// Mappers
export function toVideoFormat(dto: YtDlpFormatDTO): VideoFormat {
  const vcodec = dto.vcodec === "none" ? null : (dto.vcodec ?? null);
  const acodec = dto.acodec === "none" ? null : (dto.acodec ?? null);

  return {
    formatId: dto.format_id,
    label: dto.format_note ?? dto.format_id,
    extension: dto.ext,
    resolution: dto.resolution === "audio only" ? null : (dto.resolution ?? null),
    fps: dto.fps ?? null,
    videoCodec: vcodec,
    audioCodec: acodec,
    audioBitrate: dto.abr ?? null,
    videoBitrate: dto.vbr ?? null,
    filesize: dto.filesize ?? dto.filesize_approx ?? null,
    width: dto.width ?? null,
    height: dto.height ?? null,
    hasVideo: vcodec !== null,
    hasAudio: acodec !== null,
  };
}

export function toVideoInfo(dto: YtDlpInfoDTO): VideoInfo {
  const formats = (dto.formats ?? [])
    .map(toVideoFormat)
    .filter((f) => f.hasVideo || f.hasAudio);

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? null,
    thumbnailUrl: dto.thumbnail ?? dto.thumbnails?.at(-1)?.url ?? null,
    durationSeconds: dto.duration ?? null,
    durationFormatted: dto.duration_string ?? null,
    uploader: dto.uploader ?? null,
    uploaderUrl: dto.uploader_url ?? null,
    uploadDate: dto.upload_date ?? null,
    viewCount: dto.view_count ?? null,
    sourceUrl: dto.webpage_url,
    platform: dto.extractor_key ?? dto.extractor,
    formats,
  };
}
