import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/lib/tauriClient";
import {
  getImpersonationCapabilities,
  getSettings,
  updateSettings,
} from "../api/settingsApi";
import {
  createEmptyDraftSite,
  createSettingsDraft,
  serializeSettingsDraft,
  validateSites,
  type SiteErrors,
} from "../services/settingsService";
import type {
  DraftSiteImpersonationSetting,
  ImpersonationCapabilities,
  SettingsDraft,
} from "../types";

export function useSettingsDialog(isOpen: boolean) {
  const loadGeneration = useRef(0);
  const capabilityGeneration = useRef(0);
  const saveGeneration = useRef(0);
  const nextSiteId = useRef(0);
  const [settings, setSettings] = useState<SettingsDraft | null>(null);
  const [capabilities, setCapabilities] =
    useState<ImpersonationCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [siteErrors, setSiteErrors] = useState<SiteErrors>({});
  const allocateSiteId = useCallback(
    () => `site-rule-${++nextSiteId.current}`,
    [],
  );

  const load = useCallback(async () => {
    const loadRequest = ++loadGeneration.current;
    const capabilityRequest = ++capabilityGeneration.current;
    setIsLoading(true);
    setIsRefreshing(false);
    setSettings(null);
    setLoadError(null);
    setCapabilityError(null);
    setSaveFeedback(null);
    const [settingsResult, capabilitiesResult] = await Promise.allSettled([
      getSettings(),
      getImpersonationCapabilities(),
    ]);

    if (loadRequest !== loadGeneration.current) return;
    if (settingsResult.status === "fulfilled") {
      setSettings(createSettingsDraft(settingsResult.value, allocateSiteId));
    } else {
      setLoadError(
        getErrorMessage(settingsResult.reason, "Unable to load settings."),
      );
    }
    if (capabilityRequest === capabilityGeneration.current) {
      if (capabilitiesResult.status === "fulfilled") {
        setCapabilities(capabilitiesResult.value);
      } else {
        setCapabilityError(
          getErrorMessage(
            capabilitiesResult.reason,
            "Unable to inspect browser profiles.",
          ),
        );
      }
    }
    setIsLoading(false);
  }, [allocateSiteId]);

  useEffect(() => {
    if (isOpen) void load();
    return () => {
      loadGeneration.current += 1;
      capabilityGeneration.current += 1;
      saveGeneration.current += 1;
    };
  }, [isOpen, load]);

  const refreshCapabilities = async () => {
    const request = ++capabilityGeneration.current;
    setIsRefreshing(true);
    setCapabilityError(null);
    try {
      const nextCapabilities = await getImpersonationCapabilities(true);
      if (request === capabilityGeneration.current) {
        setCapabilities(nextCapabilities);
      }
    } catch (error) {
      if (request === capabilityGeneration.current) {
        setCapabilityError(
          getErrorMessage(error, "Unable to refresh browser profiles."),
        );
      }
    } finally {
      if (request === capabilityGeneration.current) setIsRefreshing(false);
    }
  };

  const save = async () => {
    if (!settings) return;
    const errors = validateSites(settings.impersonation.sites);
    setSiteErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const request = ++saveGeneration.current;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const savedSettings = await updateSettings(
        serializeSettingsDraft(settings),
      );
      if (request !== saveGeneration.current) return;
      setSettings(createSettingsDraft(savedSettings, allocateSiteId, settings));
      setSaveFeedback({ type: "success", message: "Settings saved." });
    } catch (error) {
      if (request !== saveGeneration.current) return;
      setSaveFeedback({
        type: "error",
        message: getErrorMessage(error, "Unable to save settings."),
      });
    } finally {
      if (request === saveGeneration.current) setIsSaving(false);
    }
  };

  const createSite = (): DraftSiteImpersonationSetting =>
    createEmptyDraftSite(allocateSiteId());

  const updateDraft = (next: SettingsDraft) => {
    if (isSaving) return;
    setSettings(next);
    setSaveFeedback(null);
    setSiteErrors({});
  };

  return {
    settings,
    capabilities,
    isLoading,
    isSaving,
    isRefreshing,
    loadError,
    capabilityError,
    saveFeedback,
    siteErrors,
    updateDraft,
    createSite,
    load,
    save,
    refreshCapabilities,
  };
}
