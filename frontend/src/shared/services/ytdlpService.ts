import { invokeCommand } from "@/shared/lib/tauriClient";
import type { UpdateCheckResult } from "@/features/setup/types";

/** Version of the yt-dlp binary the app is running against. */
export function fetchYtdlpVersion(): Promise<string> {
  return invokeCommand<string>("get_ytdlp_version");
}

/**
 * Compare the installed yt-dlp version against the latest GitHub release.
 * Backed by a 24h disk cache unless `force` is set.
 */
export function checkYtdlpUpdate(force = false): Promise<UpdateCheckResult> {
  return invokeCommand<UpdateCheckResult>("check_ytdlp_update", { force });
}

/** Update the locally managed yt-dlp binary to the latest release. */
export function updateYtdlp(): Promise<string> {
  return invokeCommand<string>("update_ytdlp");
}
