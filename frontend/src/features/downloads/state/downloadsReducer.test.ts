import { describe, expect, it } from "vitest";
import { createDownloadItem } from "../services/downloadService";
import type { DownloadProgressEvent, StartDownloadInput } from "../types";
import { downloadsReducer } from "./downloadsReducer";

const input: StartDownloadInput = {
  url: "https://www.tiktok.com/video/123",
  formatId: "h264",
  formatLabel: "720p",
  title: "Video",
  thumbnailUrl: null,
  executionContext: { settingsRevision: 0, runtimeId: "py", browser: "chrome" },
};

describe("download retry progress", () => {
  it("keeps one active download and the execution context during browser retries", () => {
    const item = createDownloadItem(input, "C:/Downloads/video.mp4");
    const progress: DownloadProgressEvent = {
      downloadId: item.id,
      stage: "retrying",
      downloadedBytes: null,
      totalBytes: null,
      speedBytesPerSec: null,
      etaSeconds: null,
      fragmentIndex: null,
      fragmentCount: null,
      attempt: { browser: "safari", attempt: 2 },
      executionContext: {
        settingsRevision: 0,
        runtimeId: "py",
        browser: "safari",
      },
    };
    const state = downloadsReducer(
      { items: [item] },
      { type: "progress", id: item.id, progress },
    );
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.status).toBe("retrying");
    expect(state.items[0]?.executionContext?.browser).toBe("safari");
    expect(state.items[0]?.savePath).toBe("C:/Downloads/video.mp4");
    const transferring = downloadsReducer(state, {
      type: "progress",
      id: item.id,
      progress: {
        ...progress,
        stage: "downloading",
        attempt: null,
        executionContext: null,
        downloadedBytes: 10,
      },
    });
    expect(transferring.items[0]?.executionContext?.browser).toBe("safari");
    expect(transferring.items[0]?.attempt).toBeNull();
  });

  it("does not revive a paused download when a late retry update arrives", () => {
    const item = {
      ...createDownloadItem(input, "video.mp4"),
      status: "paused" as const,
    };
    const state = downloadsReducer(
      { items: [item] },
      {
        type: "progress",
        id: item.id,
        progress: {
          downloadId: item.id,
          stage: "retrying",
          downloadedBytes: null,
          totalBytes: null,
          speedBytesPerSec: null,
          etaSeconds: null,
          fragmentIndex: null,
          fragmentCount: null,
          attempt: { browser: "safari", attempt: 2 },
          executionContext: null,
        },
      },
    );
    expect(state.items[0]?.status).toBe("paused");
  });
});
