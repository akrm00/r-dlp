import { useCallback, useState } from "react";
import { toast } from "sonner";
import { checkYtdlpUpdate, updateYtdlp } from "@/shared/services/ytdlpService";
import { getErrorMessage, TauriError } from "@/shared/lib/tauriClient";
import type { UpdateCheckResult } from "@/features/setup/types";

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date"; result: UpdateCheckResult }
  | { status: "available"; result: UpdateCheckResult }
  | { status: "updating"; result: UpdateCheckResult }
  | { status: "updated"; version: string }
  | { status: "error"; message: string };

/** Drives the yt-dlp update check/update flow shown from the Header badge. */
export function useYtdlpUpdate() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  const checkNow = useCallback(async (force = false) => {
    setState({ status: "checking" });

    try {
      const result = await checkYtdlpUpdate(force);
      if (result.updateAvailable) {
        setState({ status: "available", result });
      } else {
        setState({ status: "up-to-date", result });
      }
    } catch (err) {
      const message =
        err instanceof TauriError
          ? err.message
          : "Failed to check for yt-dlp updates.";
      setState({ status: "error", message });
    }
  }, []);

  const update = useCallback(async () => {
    setState((prev) =>
      prev.status === "available"
        ? { status: "updating", result: prev.result }
        : prev,
    );

    try {
      const version = await updateYtdlp();
      setState({ status: "updated", version });
      toast.success(`yt-dlp updated to ${version}`);
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update yt-dlp. Please try again.");
      setState({ status: "error", message });
      toast.error(message);
    }
  }, []);

  return { state, checkNow, update } as const;
}
