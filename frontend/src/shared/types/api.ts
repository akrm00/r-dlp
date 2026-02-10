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
