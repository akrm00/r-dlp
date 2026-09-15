import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteErrors } from "../services/settingsService";
import type { DraftSiteImpersonationSetting } from "../types";
import { BrowserSelect } from "./BrowserSelect";
import { ModeSelect } from "./ModeSelect";

type SiteRulesEditorProps = {
  sites: DraftSiteImpersonationSetting[];
  browsers: string[];
  errors: SiteErrors;
  createSite: () => DraftSiteImpersonationSetting;
  onChange: (sites: DraftSiteImpersonationSetting[]) => void;
};

export function SiteRulesEditor({
  sites,
  browsers,
  errors,
  createSite,
  onChange,
}: SiteRulesEditorProps) {
  const updateSite = (index: number, next: DraftSiteImpersonationSetting) => {
    onChange(
      sites.map((site, siteIndex) => (siteIndex === index ? next : site)),
    );
  };

  const removeSite = (index: number) => {
    onChange(sites.filter((_, siteIndex) => siteIndex !== index));
  };

  const addSite = () => {
    onChange([...sites, createSite()]);
  };

  return (
    <section className="space-y-3" aria-labelledby="site-rules-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="site-rules-heading" className="text-heading">
            Site exceptions
          </h3>
          <p className="text-muted-foreground text-caption mt-1">
            Paste a domain or http(s) URL. Rules include subdomains, and the
            most specific domain wins. A site set to Always impersonate still
            applies when the global behavior is Never impersonate.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSite}>
          <Plus /> Add site
        </Button>
      </div>

      {sites.length === 0 && (
        <p className="bg-muted/30 text-muted-foreground rounded-xl px-4 py-3 text-sm">
          All sites currently use the global setting.
        </p>
      )}

      {sites.map((site, index) => {
        const domainId = `site-domain-${index}`;
        const errorId = `site-domain-error-${index}`;
        const removeLabel = `Remove ${site.domain.trim() || "new site"}`;
        return (
          <div
            key={site.clientId}
            className="bg-muted/30 border-hairline grid gap-3 rounded-xl border p-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
          >
            <div className="space-y-1.5">
              <Label htmlFor={domainId}>Site domain</Label>
              <Input
                className="h-9 rounded-md bg-transparent px-3 text-sm dark:bg-input/30"
                id={domainId}
                value={site.domain}
                aria-invalid={Boolean(errors[index])}
                aria-describedby={errors[index] ? errorId : undefined}
                placeholder="example.com"
                onChange={(event) =>
                  updateSite(index, { ...site, domain: event.target.value })
                }
              />
              {errors[index] && (
                <p id={errorId} className="text-destructive text-caption">
                  {errors[index]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Behavior</Label>
              <ModeSelect
                label={`Behavior for site ${index + 1}`}
                value={site.mode}
                onChange={(mode) => updateSite(index, { ...site, mode })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Browser</Label>
              <BrowserSelect
                label={`Browser for site ${index + 1}`}
                value={site.browser}
                browsers={browsers}
                allowGlobal
                onChange={(browser) => updateSite(index, { ...site, browser })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="self-end"
              aria-label={removeLabel}
              onClick={() => removeSite(index)}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
    </section>
  );
}
