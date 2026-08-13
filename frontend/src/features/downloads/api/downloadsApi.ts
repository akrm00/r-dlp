import { Channel } from "@tauri-apps/api/core";
import { invokeCommand } from "@/shared/lib/tauriClient";
import type {
  DownloadId,
  DownloadProgressEvent,
  DownloadResult,
} from "../types";

type RunDownloadInput = {
  downloadId: DownloadId;
  url: string;
  formatId: string;
  savePath: string;
};

export function getDownloadFilename(
  url: string,
  formatId: string,
): Promise<string> {
  return invokeCommand<string>("get_download_filename", { url, formatId });
}

/**
 * Run one download to completion.
 *
 * Progress arrives on a Tauri channel scoped to this call, so nothing has to be
 * unsubscribed and updates from concurrent downloads never need filtering.
 */
export function runDownload(
  input: RunDownloadInput,
  onProgress: (progress: DownloadProgressEvent) => void,
): Promise<DownloadResult> {
  const progressChannel = new Channel<DownloadProgressEvent>();
  progressChannel.onmessage = onProgress;

  return invokeCommand<DownloadResult>("download_video", {
    url: input.url,
    formatId: input.formatId,
    savePath: input.savePath,
    downloadId: input.downloadId,
    onProgress: progressChannel,
  });
}

/** Stop a download and discard its partial file. */
export function cancelDownload(downloadId: DownloadId): Promise<void> {
  return invokeCommand<void>("cancel_download", { downloadId });
}

/** Stop a download but keep its partial file so it can be resumed. */
export function pauseDownload(downloadId: DownloadId): Promise<void> {
  return invokeCommand<void>("pause_download", { downloadId });
}

/**
 * Delete the temporary files left by a stopped download. The downloaded file itself
 * is never touched, so this is safe to call for any non-completed item.
 */
export function discardPartialDownload(savePath: string): Promise<void> {
  return invokeCommand<void>("discard_partial_download", { savePath });
}

export function showInFolder(path: string): Promise<void> {
  return invokeCommand<void>("show_in_folder", { path });
}
