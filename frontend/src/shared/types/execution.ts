export type ExecutionContext = {
  settingsRevision: number;
  runtimeId: string;
  browser: string | null;
};

export type AttemptProgress = {
  browser: string | null;
  attempt: number;
};

export type DownloadFilename = {
  filename: string;
  executionContext: ExecutionContext;
};
