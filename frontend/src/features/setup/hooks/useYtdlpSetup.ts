import { useState, useCallback } from "react";
import { invokeCommand, TauriError } from "@/shared/lib/tauriClient";

type SetupState =
  | { status: "idle" }
  | { status: "installing" }
  | { status: "success"; version: string }
  | { status: "error"; message: string };

export function useYtdlpSetup() {
  const [state, setState] = useState<SetupState>({ status: "idle" });

  const install = useCallback(async () => {
    setState({ status: "installing" });

    try {
      const version = await invokeCommand<string>("install_ytdlp");
      setState({ status: "success", version });
    } catch (err) {
      const message =
        err instanceof TauriError
          ? err.message
          : "Failed to install yt-dlp. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, install, reset } as const;
}
