export type ImpersonationMode = "automatic" | "always" | "never";

export type SiteImpersonationSetting = {
  domain: string;
  mode: ImpersonationMode;
  browser: string | null;
};

export type AppSettings = {
  schemaVersion: 1;
  revision: number;
  impersonation: {
    mode: ImpersonationMode;
    browser: string;
    sites: SiteImpersonationSetting[];
  };
};

export type DraftSiteImpersonationSetting = SiteImpersonationSetting & {
  clientId: string;
};

export type SettingsDraft = Omit<AppSettings, "impersonation"> & {
  impersonation: Omit<AppSettings["impersonation"], "sites"> & {
    sites: DraftSiteImpersonationSetting[];
  };
};

export type ImpersonationRuntime = {
  id: string;
  label: string;
  version: string | null;
  browsers: string[];
  error: string | null;
};

export type ImpersonationCapabilities = {
  runtimes: ImpersonationRuntime[];
};
