import { invokeCommand } from "@/shared/lib/tauriClient";

/** Version of the yt-dlp binary the app is running against. */
export function fetchYtdlpVersion(): Promise<string> {
  return invokeCommand<string>("get_ytdlp_version");
}
