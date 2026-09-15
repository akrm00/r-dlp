import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { availableBrowsers } from "../services/settingsService";
import type { useSettingsDialog } from "../hooks/useSettingsDialog";
import { BrowserSelect } from "./BrowserSelect";
import { ModeSelect } from "./ModeSelect";
import { RuntimeDiagnostics } from "./RuntimeDiagnostics";
import { SiteRulesEditor } from "./SiteRulesEditor";

type SettingsState = ReturnType<typeof useSettingsDialog>;

type SettingsFormProps = {
  state: SettingsState;
  onCancel: () => void;
};

export function SettingsForm({ state, onCancel }: SettingsFormProps) {
  if (!state.settings) return null;
  const { settings } = state;
  const browsers = availableBrowsers(state.capabilities);
  const configuredUnavailable = !browsers.includes(
    settings.impersonation.browser,
  );

  return (
    <fieldset disabled={state.isSaving} className="contents">
      <div className="space-y-5">
        <section
          className="space-y-3"
          aria-labelledby="global-settings-heading"
        >
          <div>
            <h3 id="global-settings-heading" className="text-heading">
              Global behavior
            </h3>
            <p className="text-muted-foreground text-caption mt-1">
              Automatic tries the regular connection first, then available
              profiles.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Behavior</Label>
              <ModeSelect
                label="Global behavior"
                value={settings.impersonation.mode}
                onChange={(mode) =>
                  state.updateDraft({
                    ...settings,
                    impersonation: { ...settings.impersonation, mode },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred browser</Label>
              <BrowserSelect
                label="Preferred browser"
                value={settings.impersonation.browser}
                browsers={browsers}
                onChange={(browser) => {
                  if (!browser) return;
                  state.updateDraft({
                    ...settings,
                    impersonation: { ...settings.impersonation, browser },
                  });
                }}
              />
            </div>
          </div>
          {configuredUnavailable && (
            <p className="text-warning text-caption">
              This preference is unavailable right now and will be kept. r-dlp
              falls back to other available profiles when the preferred browser
              cannot be used.
            </p>
          )}
        </section>

        <Separator />
        <SiteRulesEditor
          sites={settings.impersonation.sites}
          browsers={browsers}
          errors={state.siteErrors}
          createSite={state.createSite}
          onChange={(sites) =>
            state.updateDraft({
              ...settings,
              impersonation: { ...settings.impersonation, sites },
            })
          }
        />
        <Separator />
        <RuntimeDiagnostics
          capabilities={state.capabilities}
          isRefreshing={state.isRefreshing}
          onRefresh={state.refreshCapabilities}
        />

        {state.capabilityError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{state.capabilityError}</AlertDescription>
          </Alert>
        )}
        {state.saveFeedback && (
          <Alert
            variant={
              state.saveFeedback.type === "success" ? "success" : "destructive"
            }
          >
            {state.saveFeedback.type === "success" ? (
              <CheckCircle2 />
            ) : (
              <AlertCircle />
            )}
            <AlertDescription>{state.saveFeedback.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <span className="text-muted-foreground text-caption">
            Changes apply to new requests and resumed downloads.
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={state.isSaving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={state.isSaving}
              onClick={state.save}
            >
              {state.isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
