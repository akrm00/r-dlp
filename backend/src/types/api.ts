import type { VideoInfo } from "./ytdlp.js";

export type AnalyzeRequest = {
  url: string;
};

export type AnalyzeResponse = {
  success: true;
  data: VideoInfo;
};

export type VersionResponse = {
  success: true;
  data: {
    version: string;
    lastUpdated: string | null;
  };
};

export type UpdateResponse = {
  success: true;
  data: {
    previousVersion: string;
    newVersion: string;
  };
};

export type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
  };
};
