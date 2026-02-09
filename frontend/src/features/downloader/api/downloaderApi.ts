import { post, get } from "@/shared/lib/apiClient";
import type { AnalyzeResponse, VersionResponse } from "@/shared/types/api";

export function analyzeUrl(
  url: string,
  token: string,
): Promise<AnalyzeResponse> {
  return post<AnalyzeResponse>("/api/analyze", { url }, token);
}

export function fetchVersion(): Promise<VersionResponse> {
  return get<VersionResponse>("/api/version");
}
