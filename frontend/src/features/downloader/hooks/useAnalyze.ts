import { useState, useCallback, useRef, useEffect } from "react";
import { analyzeUrl } from "../api/downloaderApi";
import { getErrorMessage } from "@/shared/lib/tauriClient";
import type { VideoInfo } from "@/shared/types/api";
import type { AttemptProgress } from "@/shared/types/execution";

type AnalyzeState =
  | { status: "idle" }
  | { status: "loading"; attempt: AttemptProgress | null }
  | { status: "success"; data: VideoInfo; requestUrl: string }
  | { status: "error"; message: string };

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  const analyze = useCallback(async (url: string) => {
    const current = ++generation.current;
    setState({ status: "loading", attempt: null });

    try {
      const data = await analyzeUrl(url, (attempt) => {
        if (current === generation.current)
          setState({ status: "loading", attempt });
      });
      if (current !== generation.current) return;
      setState({ status: "success", data, requestUrl: url });
    } catch (error) {
      if (current !== generation.current) return;
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
    generation.current += 1;
    setState({ status: "idle" });
  }, []);

  return { state, analyze, reset } as const;
}
