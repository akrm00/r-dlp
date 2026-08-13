import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/shared/lib/tauriClient";
import { showInFolder } from "../api/downloadsApi";

/** Reveal a downloaded file in the system file explorer. */
export function useShowInFolder() {
  return useCallback(async (path: string) => {
    try {
      await showInFolder(path);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not open the file location."),
      );
    }
  }, []);
}
