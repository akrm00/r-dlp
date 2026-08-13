import { formatBytes } from "@/shared/utils/format";
import type {
  DownloadId,
  DownloadItem,
  DownloadStatus,
  StartDownloadInput,
} from "../types";

const EM_DASH = "—";

const STATUS_LABELS: Record<DownloadStatus, string> = {
  queued: "Queued",
  downloading: "Downloading",
  processing: "Processing",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Statuses that still occupy the user's attention (and the tab badge). */
const ACTIVE_STATUSES: readonly DownloadStatus[] = [
  "queued",
  "downloading",
  "processing",
];

export function getStatusLabel(status: DownloadStatus): string {
  return STATUS_LABELS[status];
}

export function isActive(status: DownloadStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** A download that owns a backend run, and can therefore be paused or cancelled. */
export function isStoppable(status: DownloadStatus): boolean {
  return isActive(status);
}

/** A download that can be started again from wherever it stopped. */
export function isRestartable(status: DownloadStatus): boolean {
  return status === "paused" || status === "failed" || status === "cancelled";
}

export function countActive(items: DownloadItem[]): number {
  return items.filter((item) => isActive(item.status)).length;
}

/**
 * Percentage of bytes transferred, or `null` when the total size is still unknown
 * (some live streams and fragmented formats never report one).
 */
export function computePercent(item: DownloadItem): number | null {
  if (item.status === "completed") return 100;

  const { downloadedBytes, totalBytes } = item;
  if (downloadedBytes === null || totalBytes === null || totalBytes <= 0) {
    // A download that has not started yet sits at zero rather than unknown.
    return item.status === "queued" ? 0 : null;
  }

  const percent = (downloadedBytes / totalBytes) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function formatSpeed(bytesPerSecond: number | null): string {
  if (bytesPerSecond === null || bytesPerSecond <= 0) return EM_DASH;
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return EM_DASH;
  }
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** "12.4 MB / 108 MB", degrading gracefully when either side is unknown. */
export function formatTransferred(item: DownloadItem): string {
  const downloaded =
    item.downloadedBytes === null ? EM_DASH : formatBytes(item.downloadedBytes);
  const total =
    item.totalBytes === null || item.totalBytes <= 0
      ? EM_DASH
      : formatBytes(item.totalBytes);

  return `${downloaded} / ${total}`;
}

/**
 * 1-based place in the waiting line. The backend hands out slots in request order,
 * so the oldest queued download is next.
 */
export function getQueuePosition(
  items: DownloadItem[],
  id: DownloadId,
): number | null {
  const waiting = items
    .filter((item) => item.status === "queued")
    .sort((a, b) => a.startedAt - b.startedAt);

  const index = waiting.findIndex((item) => item.id === id);
  return index === -1 ? null : index + 1;
}

const SUMMARY_ORDER: readonly DownloadStatus[] = [
  "downloading",
  "processing",
  "queued",
  "paused",
  "completed",
  "failed",
  "cancelled",
];

/** One-line recap of the list, announced to screen readers as it changes. */
export function summarizeDownloads(items: DownloadItem[]): string {
  if (items.length === 0) return "No downloads yet.";

  const parts = SUMMARY_ORDER.map((status) => {
    const count = items.filter((item) => item.status === status).length;
    return count === 0 ? null : `${count} ${STATUS_LABELS[status].toLowerCase()}`;
  }).filter((part): part is string => part !== null);

  return `${parts.join(", ")}.`;
}

export function getFileName(path: string): string {
  const separatorIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separatorIndex === -1 ? path : path.slice(separatorIndex + 1);
}

/**
 * Build the item that represents a download run.
 *
 * The only impure function here: it stamps a fresh id and start time.
 */
export function createDownloadItem(
  input: StartDownloadInput,
  savePath: string,
): DownloadItem {
  return {
    id: crypto.randomUUID() as DownloadId,
    url: input.url,
    formatId: input.formatId,
    formatLabel: input.formatLabel,
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    savePath,
    status: "queued",
    downloadedBytes: null,
    totalBytes: null,
    speedBytesPerSec: null,
    etaSeconds: null,
    fragmentIndex: null,
    fragmentCount: null,
    errorMessage: null,
    startedAt: Date.now(),
    completedAt: null,
  };
}
