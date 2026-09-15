import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { VideoInfo } from "@/shared/types/api";
import { analyzeUrl } from "../api/downloaderApi";
import { useAnalyze } from "./useAnalyze";

vi.mock("../api/downloaderApi", () => ({ analyzeUrl: vi.fn() }));

const video: VideoInfo = {
  id: "123",
  title: "Video",
  description: null,
  thumbnailUrl: null,
  durationSeconds: null,
  durationFormatted: null,
  uploader: null,
  uploaderUrl: null,
  uploadDate: null,
  viewCount: null,
  sourceUrl: "https://www.youtube.com/watch?v=123",
  platform: "YouTube",
  formats: [],
  executionContext: { settingsRevision: 0, runtimeId: "py", browser: "chrome" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

it("retains the submitted domain so its site rule also applies after redirects", async () => {
  vi.mocked(analyzeUrl).mockResolvedValue(video);
  const { result } = renderHook(useAnalyze);
  await act(() => result.current.analyze("https://youtu.be/123"));
  expect(result.current.state).toMatchObject({
    status: "success",
    requestUrl: "https://youtu.be/123",
    data: video,
  });
});

it("ignores an earlier analysis that finishes after a newer request", async () => {
  let completeFirst!: (info: VideoInfo) => void;
  vi.mocked(analyzeUrl)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeFirst = resolve;
        }),
    )
    .mockResolvedValueOnce({ ...video, title: "Latest video" });
  const { result } = renderHook(useAnalyze);
  let first!: Promise<void>;
  act(() => {
    first = result.current.analyze("https://youtu.be/first");
  });
  await act(() => result.current.analyze("https://youtu.be/latest"));
  await act(async () => {
    completeFirst(video);
    await first;
  });
  expect(result.current.state).toMatchObject({
    status: "success",
    data: { title: "Latest video" },
  });
});
