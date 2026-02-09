import { spawn, execFile } from "child_process";
import { logger } from "../utils/logger.js";
import { toVideoInfo, type VideoInfo, type YtDlpInfoDTO } from "../types/ytdlp.js";
import type { Readable } from "stream";
import type { ChildProcess } from "child_process";

const YTDLP_BINARY = process.env.YTDLP_PATH ?? "yt-dlp";
const ANALYZE_TIMEOUT_MS = 30_000;

export class YtDlpError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null = null,
  ) {
    super(message);
    this.name = "YtDlpError";
  }
}

export type DownloadHandle = {
  stream: Readable;
  process: ChildProcess;
  kill: () => void;
};

export async function analyze(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const proc = spawn(YTDLP_BINARY, [
      "--dump-json",
      "--no-warnings",
      "--no-playlist",
      url,
    ]);

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new YtDlpError("Analysis timed out after 30 seconds"));
    }, ANALYZE_TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      logger.error("yt-dlp spawn error", err);
      reject(
        new YtDlpError(
          "Failed to start yt-dlp. Make sure it is installed and accessible.",
        ),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
        const message = stderr || `yt-dlp exited with code ${code}`;
        logger.warn("yt-dlp analyze failed", { code, stderr: message, url });
        reject(new YtDlpError(cleanErrorMessage(message), code));
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        const dto = JSON.parse(raw) as YtDlpInfoDTO;
        resolve(toVideoInfo(dto));
      } catch (err) {
        logger.error("Failed to parse yt-dlp JSON output", err);
        reject(new YtDlpError("Failed to parse video information"));
      }
    });
  });
}

export async function getFilename(
  url: string,
  formatId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_BINARY,
      ["--print", "filename", "-f", formatId, "--no-playlist", url],
      { timeout: 15_000 },
      (err, stdout, stderr) => {
        if (err) {
          logger.warn("yt-dlp get filename failed", { stderr, url, formatId });
          resolve("download");
          return;
        }
        const filename = stdout.trim();
        resolve(filename || "download");
      },
    );
  });
}

export function downloadStream(url: string, formatId: string): DownloadHandle {
  const proc = spawn(YTDLP_BINARY, [
    "-f",
    formatId,
    "-o",
    "-",
    "--no-warnings",
    "--no-playlist",
    url,
  ]);

  const stderrChunks: Buffer[] = [];
  proc.stderr.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  proc.on("error", (err) => {
    logger.error("yt-dlp download spawn error", err);
  });

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
      logger.warn("yt-dlp download failed", { code, stderr, url, formatId });
    }
  });

  return {
    stream: proc.stdout,
    process: proc,
    kill: () => {
      if (!proc.killed) {
        proc.kill("SIGTERM");
      }
    },
  };
}

export async function getVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_BINARY,
      ["--version"],
      { timeout: 10_000 },
      (err, stdout) => {
        if (err) {
          logger.error("Failed to get yt-dlp version", err);
          reject(new YtDlpError("Failed to get yt-dlp version"));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

export async function updateYtDlp(): Promise<{
  previousVersion: string;
  newVersion: string;
}> {
  const previousVersion = await getVersion().catch(() => "unknown");

  return new Promise((resolve, reject) => {
    execFile(
      "pip3",
      ["install", "--break-system-packages", "--upgrade", "yt-dlp"],
      { timeout: 120_000 },
      (err, stdout, stderr) => {
        if (err) {
          logger.error("yt-dlp update failed", err, { stderr });
          reject(new YtDlpError("Failed to update yt-dlp"));
          return;
        }

        logger.info("yt-dlp update output", { stdout: stdout.trim() });

        getVersion()
          .then((newVersion) => {
            logger.info("yt-dlp updated", { previousVersion, newVersion });
            resolve({ previousVersion, newVersion });
          })
          .catch(() => {
            resolve({ previousVersion, newVersion: "unknown" });
          });
      },
    );
  });
}

function cleanErrorMessage(stderr: string): string {
  if (stderr.includes("Unsupported URL")) {
    return "This URL is not supported. Please check the URL and try again.";
  }
  if (stderr.includes("Video unavailable") || stderr.includes("not available")) {
    return "This video is unavailable or has been removed.";
  }
  if (stderr.includes("Private video")) {
    return "This video is private and cannot be accessed.";
  }
  if (stderr.includes("Sign in to confirm")) {
    return "This video requires authentication and cannot be downloaded.";
  }

  const lines = stderr.split("\n");
  const errorLine = lines.find((l) => l.startsWith("ERROR:"));
  if (errorLine) {
    return errorLine.replace("ERROR: ", "").trim();
  }

  return "Failed to analyze the video. Please check the URL and try again.";
}
