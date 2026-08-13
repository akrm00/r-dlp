import { invokeCommand } from "@/shared/lib/tauriClient";
import type { VideoInfo } from "@/shared/types/api";

export function analyzeUrl(url: string): Promise<VideoInfo> {
  return invokeCommand<VideoInfo>("analyze_url", { url });
}
