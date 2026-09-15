import type {
  AppSettings,
  DraftSiteImpersonationSetting,
  ImpersonationCapabilities,
  SettingsDraft,
  SiteImpersonationSetting,
} from "../types";

export type SiteErrors = Record<number, string>;

export function availableBrowsers(
  capabilities: ImpersonationCapabilities | null,
): string[] {
  const browsers =
    capabilities?.runtimes.flatMap((runtime) => runtime.browsers) ?? [];
  return [...new Set(browsers)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function comparableHost(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    const url = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(`http://${trimmed}`);
    return url.hostname.replace(/\.$/, "");
  } catch {
    return trimmed.replace(/\.$/, "");
  }
}

export function validateSites(sites: SiteImpersonationSetting[]): SiteErrors {
  const errors: SiteErrors = {};
  const firstIndexByHost = new Map<string, number>();

  sites.forEach((site, index) => {
    const host = comparableHost(site.domain);
    if (!host) {
      errors[index] = "Domain is required.";
      return;
    }

    const duplicateIndex = firstIndexByHost.get(host);
    if (duplicateIndex !== undefined) {
      errors[index] = "This site is already listed.";
      errors[duplicateIndex] = "This site is already listed.";
      return;
    }
    firstIndexByHost.set(host, index);
  });

  return errors;
}

export function browserLabel(browser: string): string {
  return browser
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createSettingsDraft(
  settings: AppSettings,
  allocateId: () => string,
  previous?: SettingsDraft,
): SettingsDraft {
  return {
    ...settings,
    impersonation: {
      ...settings.impersonation,
      sites: settings.impersonation.sites.map((site, index) => ({
        ...site,
        clientId:
          previous?.impersonation.sites[index]?.clientId ?? allocateId(),
      })),
    },
  };
}

export function createEmptyDraftSite(
  clientId: string,
): DraftSiteImpersonationSetting {
  return { clientId, domain: "", mode: "automatic", browser: null };
}

export function serializeSettingsDraft(settings: SettingsDraft): AppSettings {
  return {
    ...settings,
    impersonation: {
      ...settings.impersonation,
      sites: settings.impersonation.sites.map((site) => ({
        domain: site.domain,
        mode: site.mode,
        browser: site.browser,
      })),
    },
  };
}
