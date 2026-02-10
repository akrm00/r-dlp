import { useCallback } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { getDownloadFilename, downloadVideo } from "../api/downloaderApi";
import { TauriError } from "@/shared/lib/tauriClient";
import { toast } from "sonner";

export function useDownload() {
  const download = useCallback(async (url: string, formatId: string) => {
    try {
      const suggestedName = await getDownloadFilename(url, formatId);

      const savePath = await save({
        defaultPath: suggestedName,
        title: "Save download as",
      });

      if (!savePath) {
        return;
      }

      toast.info("Download started...");
      const savedPath = await downloadVideo(url, formatId, savePath);
      toast.success(`Downloaded to: ${savedPath}`);
    } catch (err) {
      if (err instanceof TauriError && err.message.includes("cancelled")) {
        return;
      }
      const message =
        err instanceof TauriError
          ? err.message
          : "Download failed. Please try again.";
      toast.error(message);
    }
  }, []);

  return { download } as const;
}
