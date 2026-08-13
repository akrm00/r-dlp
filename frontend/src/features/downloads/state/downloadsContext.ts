import { createContext, useContext } from "react";
import type { DownloadId, DownloadItem, StartDownloadInput } from "../types";

export type DownloadsContextValue = {
  /** Newest first. */
  items: DownloadItem[];
  /** Queued, downloading or processing — what the tab badge counts. */
  activeCount: number;
  /**
   * Ask for a save location, then queue the download. Resolves as soon as it is
   * queued (not when it finishes), or with `null` if the user dismissed the dialog.
   */
  startDownload: (input: StartDownloadInput) => Promise<DownloadId | null>;
  /** Stop and keep the partial file. */
  pauseDownload: (id: DownloadId) => Promise<void>;
  /** Stop and discard the partial file. */
  cancelDownload: (id: DownloadId) => Promise<void>;
  /**
   * Queue the download again. Used for both resuming a paused download and
   * retrying a failed one: yt-dlp continues from the partial file when there is
   * one, and starts over when there is not.
   */
  resumeDownload: (item: DownloadItem) => void;
  /** Drop one item, cleaning up its leftover temporary files. */
  removeDownload: (item: DownloadItem) => void;
  /** Drop completed, failed and cancelled items; paused ones are kept. */
  clearFinished: () => void;
};

export const DownloadsContext = createContext<DownloadsContextValue | null>(
  null,
);

export function useDownloads(): DownloadsContextValue {
  const context = useContext(DownloadsContext);

  if (!context) {
    throw new Error("useDownloads must be used inside a DownloadsProvider.");
  }

  return context;
}
