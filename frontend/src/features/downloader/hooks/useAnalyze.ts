"use client";

import { useState, useCallback } from "react";
import { analyzeUrl } from "../api/downloaderApi";
import { useAuthContext } from "@/features/auth";
import { ApiError } from "@/shared/lib/apiClient";
import type { VideoInfo } from "@/shared/types/api";

type AnalyzeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: VideoInfo }
  | { status: "error"; message: string };

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });
  const { getAccessToken } = useAuthContext();

  const analyze = useCallback(
    async (url: string) => {
      setState({ status: "loading" });

      try {
        const token = await getAccessToken();
        if (!token) {
          setState({
            status: "error",
            message: "Session expired. Please sign in again.",
          });
          return;
        }

        const result = await analyzeUrl(url, token);
        setState({ status: "success", data: result.data });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to analyze URL. Please try again.";
        setState({ status: "error", message });
      }
    },
    [getAccessToken],
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, analyze, reset } as const;
}
