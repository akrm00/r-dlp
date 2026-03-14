import { useState, useCallback } from "react";
import { analyzeUrl } from "../api/downloaderApi";
import { TauriError } from "@/shared/lib/tauriClient";
import type { VideoInfo } from "@/shared/types/api";

type AnalyzeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: VideoInfo }
  | { status: "error"; message: string };

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });

  const analyze = useCallback(async (url: string) => {
    setState({ status: "loading" });

    try {
      const data = await analyzeUrl(url);
      setState({ status: "success", data });
    } catch (err) {
      const message =
        err instanceof TauriError
          ? err.message
          : "Failed to analyze URL. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, analyze, reset } as const;
}
