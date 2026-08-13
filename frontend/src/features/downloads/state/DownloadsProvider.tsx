import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/shared/lib/tauriClient";
import {
  cancelDownload as cancelDownloadCommand,
  discardPartialDownload,
  getDownloadFilename,
  pauseDownload as pauseDownloadCommand,
  runDownload,
  showInFolder,
} from "../api/downloadsApi";
import {
  countActive,
  createDownloadItem,
  getFileName,
} from "../services/downloadService";
import {
  DownloadsContext,
  type DownloadsContextValue,
} from "./downloadsContext";
import { downloadsReducer, initialDownloadsState } from "./downloadsReducer";
import type {
  DownloadId,
  DownloadItem,
  DownloadOutcome,
  SettledStatus,
  StartDownloadInput,
} from "../types";

const OUTCOME_STATUSES: Record<DownloadOutcome, SettledStatus> = {
  completed: "completed",
  cancelled: "cancelled",
  paused: "paused",
};

type DownloadsProviderProps = {
  children: ReactNode;
};

export function DownloadsProvider({ children }: DownloadsProviderProps) {
  const [state, dispatch] = useReducer(downloadsReducer, initialDownloadsState);

  const run = useCallback(async (item: DownloadItem) => {
    try {
      const result = await runDownload(
        {
          downloadId: item.id,
          url: item.url,
          formatId: item.formatId,
          savePath: item.savePath,
        },
        (progress) => dispatch({ type: "progress", id: item.id, progress }),
      );

      dispatch({
        type: "settle",
        id: item.id,
        status: OUTCOME_STATUSES[result.outcome],
        errorMessage: null,
        at: Date.now(),
      });

      if (result.outcome === "completed") {
        notifyCompleted(result.path);
      }
    } catch (error) {
      const message = getErrorMessage(error, "Download failed. Please try again.");
      dispatch({
        type: "settle",
        id: item.id,
        status: "failed",
        errorMessage: message,
        at: Date.now(),
      });
      toast.error(`${item.title}: ${message}`);
    }
  }, []);

  const startDownload = useCallback(
    async (input: StartDownloadInput) => {
      try {
        const suggestedName = await getDownloadFilename(
          input.url,
          input.formatId,
        );
        const savePath = await save({
          defaultPath: suggestedName,
          title: "Save download as",
        });

        if (!savePath) return null;

        const item = createDownloadItem(input, savePath);
        dispatch({ type: "enqueue", item });
        // Deliberately not awaited: the caller only waits for the download to be
        // queued, which is what lets several of them run at once.
        void run(item);

        return item.id;
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not start this download."));
        return null;
      }
    },
    [run],
  );

  const resumeDownload = useCallback(
    (item: DownloadItem) => {
      const at = Date.now();
      dispatch({ type: "restart", id: item.id, at });
      void run({ ...item, startedAt: at });
    },
    [run],
  );

  const pauseDownload = useCallback(async (id: DownloadId) => {
    try {
      await pauseDownloadCommand(id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not pause this download."));
    }
  }, []);

  const cancelDownload = useCallback(async (id: DownloadId) => {
    try {
      await cancelDownloadCommand(id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not cancel this download."));
    }
  }, []);

  const removeDownload = useCallback((item: DownloadItem) => {
    dispatch({ type: "remove", id: item.id });
    discardPartials(item);
  }, []);

  const clearFinished = useCallback(() => {
    state.items
      .filter((item) => item.status === "failed" || item.status === "cancelled")
      .forEach(discardPartials);
    dispatch({ type: "clearFinished" });
  }, [state.items]);

  const value = useMemo<DownloadsContextValue>(
    () => ({
      items: state.items,
      activeCount: countActive(state.items),
      startDownload,
      pauseDownload,
      cancelDownload,
      resumeDownload,
      removeDownload,
      clearFinished,
    }),
    [
      state.items,
      startDownload,
      pauseDownload,
      cancelDownload,
      resumeDownload,
      removeDownload,
      clearFinished,
    ],
  );

  return (
    <DownloadsContext.Provider value={value}>
      {children}
    </DownloadsContext.Provider>
  );
}

function notifyCompleted(path: string): void {
  toast.success(`Downloaded ${getFileName(path)}`, {
    duration: 8000,
    action: {
      label: "Show in folder",
      onClick: () => {
        showInFolder(path).catch(() => {
          toast.error("Could not open the file location.");
        });
      },
    },
  });
}

/** A completed download owns its file; anything else only leaves temporary files. */
function discardPartials(item: DownloadItem): void {
  if (item.status === "completed") return;

  // Best effort: a leftover temporary file is not worth interrupting the user for.
  void discardPartialDownload(item.savePath).catch(() => undefined);
}
