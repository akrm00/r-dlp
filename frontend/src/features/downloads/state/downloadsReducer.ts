import { isActive } from "../services/downloadService";
import type {
  DownloadId,
  DownloadItem,
  DownloadProgressEvent,
  SettledStatus,
} from "../types";

export type DownloadsState = {
  /** Newest first — the order the panel renders. */
  items: DownloadItem[];
};

export const initialDownloadsState: DownloadsState = { items: [] };

export type DownloadsAction =
  | { type: "enqueue"; item: DownloadItem }
  | { type: "progress"; id: DownloadId; progress: DownloadProgressEvent }
  | {
      type: "settle";
      id: DownloadId;
      status: SettledStatus;
      errorMessage: string | null;
      at: number;
    }
  | { type: "restart"; id: DownloadId; at: number }
  | { type: "remove"; id: DownloadId }
  | { type: "clearFinished" };

export function downloadsReducer(
  state: DownloadsState,
  action: DownloadsAction,
): DownloadsState {
  switch (action.type) {
    case "enqueue":
      return { items: [action.item, ...state.items] };

    case "progress":
      return updateItem(state, action.id, (item) =>
        applyProgress(item, action.progress),
      );

    case "settle":
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: action.status,
        errorMessage: action.errorMessage,
        speedBytesPerSec: null,
        etaSeconds: null,
        completedAt: action.at,
        downloadedBytes:
          action.status === "completed"
            ? (item.totalBytes ?? item.downloadedBytes)
            : item.downloadedBytes,
      }));

    case "restart":
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: "queued",
        errorMessage: null,
        speedBytesPerSec: null,
        etaSeconds: null,
        completedAt: null,
        // The download goes to the back of the queue, so its place is its new start.
        startedAt: action.at,
      }));

    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id) };

    case "clearFinished":
      // Paused downloads are kept: they still own a partial file to resume.
      return {
        items: state.items.filter(
          (item) => isActive(item.status) || item.status === "paused",
        ),
      };

    default:
      return assertNever(action);
  }
}

function updateItem(
  state: DownloadsState,
  id: DownloadId,
  update: (item: DownloadItem) => DownloadItem,
): DownloadsState {
  return {
    items: state.items.map((item) => (item.id === id ? update(item) : item)),
  };
}

/**
 * Merge one progress tick into an item. Each tick is a full snapshot from yt-dlp,
 * so numbers are replaced rather than merged.
 */
function applyProgress(
  item: DownloadItem,
  progress: DownloadProgressEvent,
): DownloadItem {
  // A late tick must not revive a download the user just paused or cancelled.
  if (!isActive(item.status)) return item;

  // "started" only announces that a queue slot was taken; it carries no numbers,
  // and on a resume the previous ones are still the best thing to show.
  if (progress.stage === "started") {
    return { ...item, status: "downloading", errorMessage: null };
  }

  const isTransferDone = progress.stage === "finished";
  const totalBytes = progress.totalBytes ?? item.totalBytes;

  return {
    ...item,
    status: progress.stage === "downloading" ? "downloading" : "processing",
    downloadedBytes: isTransferDone
      ? (totalBytes ?? progress.downloadedBytes)
      : progress.downloadedBytes,
    totalBytes,
    speedBytesPerSec: isTransferDone ? null : progress.speedBytesPerSec,
    etaSeconds: isTransferDone ? null : progress.etaSeconds,
    fragmentIndex: progress.fragmentIndex,
    fragmentCount: progress.fragmentCount,
    errorMessage: null,
  };
}

function assertNever(action: never): never {
  throw new Error(`Unhandled downloads action: ${JSON.stringify(action)}`);
}
