import { invokeCommand } from "@/shared/lib/tauriClient";
import type { AppSettings, ImpersonationCapabilities } from "../types";

export function getSettings(): Promise<AppSettings> {
  return invokeCommand<AppSettings>("get_settings");
}

export function updateSettings(settings: AppSettings): Promise<AppSettings> {
  return invokeCommand<AppSettings>("update_settings", { settings });
}

export function getImpersonationCapabilities(
  refresh = false,
): Promise<ImpersonationCapabilities> {
  return invokeCommand<ImpersonationCapabilities>(
    "get_impersonation_capabilities",
    { refresh },
  );
}
