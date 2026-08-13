import { useState, useCallback } from "react";
import { analyzeUrl } from "../api/downloaderApi";
import { getErrorMessage } from "@/shared/lib/tauriClient";
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
    } catch (error) {
      setState({
        status: "error",
        message: getErrorMessage(
          error,
          "Failed to analyze URL. Please try again.",
        ),
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, analyze, reset } as const;
}
