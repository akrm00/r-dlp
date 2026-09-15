import type {
  AttemptProgress,
  ExecutionContext,
} from "@/shared/types/execution";

/** Identifies one download run. Branded so it cannot be mixed up with other ids. */
export type DownloadId = string & { readonly __brand: "DownloadId" };

export type DownloadStatus =
  | "queued"
  | "downloading"
  | "retrying"
  | "processing"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/** Statuses a download can no longer leave on its own. */
export type SettledStatus = Extract<
  DownloadStatus,
  "completed" | "failed" | "cancelled" | "paused"
>;

/** Lifecycle stage reported by the backend while yt-dlp runs. */
export type DownloadStage =
  "started" | "retrying" | "downloading" | "processing" | "finished";

/** Payload pushed by the `download_video` command through its progress channel. */
export type DownloadProgressEvent = {
  attempt: AttemptProgress | null;
  executionContext: ExecutionContext | null;
  downloadId: string;
  stage: DownloadStage;
  downloadedBytes: number | null;
  totalBytes: number | null;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  fragmentIndex: number | null;
  fragmentCount: number | null;
};

export type DownloadOutcome = "completed" | "cancelled" | "paused";

/** Value the `download_video` command resolves with. */
export type DownloadResult = {
  executionContext: ExecutionContext | null;
  outcome: DownloadOutcome;
  path: string;
};

export type DownloadItem = {
  attempt: AttemptProgress | null;
  executionContext: ExecutionContext | null;
  id: DownloadId;
  url: string;
  formatId: string;
  formatLabel: string;
  title: string;
  thumbnailUrl: string | null;
  savePath: string;
  status: DownloadStatus;
  downloadedBytes: number | null;
  /** Exact size when known, yt-dlp's estimate otherwise, `null` while unknown. */
  totalBytes: number | null;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  fragmentIndex: number | null;
  fragmentCount: number | null;
  errorMessage: string | null;
  startedAt: number;
  completedAt: number | null;
};

/** What a caller needs to provide to queue a download. */
export type StartDownloadInput = {
  executionContext: ExecutionContext | null;
  url: string;
  formatId: string;
  formatLabel: string;
  title: string;
  thumbnailUrl: string | null;
};
