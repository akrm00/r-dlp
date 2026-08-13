import { formatBytes } from "@/shared/utils/format";
import type { VideoFormat } from "@/shared/types/api";

export type FormatFilter = "all" | "video" | "audio";
export type FormatSort = "quality" | "size";

export function filterFormats(
  formats: VideoFormat[],
  filter: FormatFilter,
): VideoFormat[] {
  switch (filter) {
    case "video":
      return formats.filter((f) => f.hasVideo);
    case "audio":
      return formats.filter((f) => f.hasAudio && !f.hasVideo);
    case "all":
      return formats;
  }
}

export function sortFormats(
  formats: VideoFormat[],
  sortBy: FormatSort,
): VideoFormat[] {
  return [...formats].sort((a, b) => {
    if (sortBy === "quality") {
      const qualityA = (a.height ?? 0) * 1000 + (a.fps ?? 0);
      const qualityB = (b.height ?? 0) * 1000 + (b.fps ?? 0);
      return qualityB - qualityA;
    }
    // sort by size descending
    return (b.filesize ?? 0) - (a.filesize ?? 0);
  });
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "Unknown";
  return formatBytes(bytes);
}

export function formatBitrate(kbps: number | null): string {
  if (kbps === null || kbps === 0) return "\u2014";
  return `${Math.round(kbps)} kbps`;
}

export function getFormatDescription(format: VideoFormat): string {
  const parts: string[] = [];

  if (format.resolution) {
    parts.push(format.resolution);
  } else if (format.hasAudio && !format.hasVideo) {
    parts.push("Audio only");
  }

  if (format.fps && format.fps > 30) {
    parts.push(`${format.fps}fps`);
  }

  parts.push(format.extension.toUpperCase());

  const codecs: string[] = [];
  if (format.videoCodec) codecs.push(format.videoCodec.split(".")[0]!);
  if (format.audioCodec) codecs.push(format.audioCodec.split(".")[0]!);
  if (codecs.length > 0) {
    parts.push(`(${codecs.join("+")})`);
  }

  return parts.join(" ");
}

export function formatViewCount(count: number | null): string {
  if (count === null) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
