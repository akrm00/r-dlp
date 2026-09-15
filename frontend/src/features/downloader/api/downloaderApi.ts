import { invokeCommand } from "@/shared/lib/tauriClient";
import type { VideoInfo } from "@/shared/types/api";
import { Channel } from "@tauri-apps/api/core";
import type { AttemptProgress } from "@/shared/types/execution";

export function analyzeUrl(
  url: string,
  onAttempt: (attempt: AttemptProgress) => void,
): Promise<VideoInfo> {
  const channel = new Channel<AttemptProgress>();
  channel.onmessage = onAttempt;
  return invokeCommand<VideoInfo>("analyze_url", { url, onAttempt: channel });
}
