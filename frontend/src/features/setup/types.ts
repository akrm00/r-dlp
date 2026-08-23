export type YtdlpStatus = {
  installed: boolean;
  version: string | null;
  path: string | null;
  /** True if this is the binary r-dlp installs and can update itself. */
  managed: boolean;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  managed: boolean;
};
