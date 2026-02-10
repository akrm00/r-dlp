import { invokeCommand } from "@/shared/lib/tauriClient";
import type { VideoInfo } from "@/shared/types/api";

export function analyzeUrl(url: string): Promise<VideoInfo> {
  return invokeCommand<VideoInfo>("analyze_url", { url });
}

export function getDownloadFilename(
  url: string,
  formatId: string,
): Promise<string> {
  return invokeCommand<string>("get_download_filename", { url, formatId });
}

export function downloadVideo(
  url: string,
  formatId: string,
  savePath: string,
): Promise<string> {
  return invokeCommand<string>("download_video", { url, formatId, savePath });
}

export function fetchVersion(): Promise<string> {
  return invokeCommand<string>("get_ytdlp_version");
}
