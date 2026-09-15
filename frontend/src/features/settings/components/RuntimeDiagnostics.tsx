import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserLabel } from "../services/settingsService";
import type { ImpersonationCapabilities } from "../types";

type RuntimeDiagnosticsProps = {
  capabilities: ImpersonationCapabilities | null;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function RuntimeDiagnostics({
  capabilities,
  isRefreshing,
  onRefresh,
}: RuntimeDiagnosticsProps) {
  const runtimes = capabilities?.runtimes ?? [];
  const hasProfiles = runtimes.some((runtime) => runtime.browsers.length > 0);

  return (
    <section className="space-y-2" aria-labelledby="capabilities-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="capabilities-heading" className="text-heading">
            Browser profiles
          </h3>
          {!hasProfiles && (
            <p className="text-warning text-caption mt-1">
              No browser profiles are currently available.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            className={
              isRefreshing ? "animate-spin motion-reduce:animate-none" : ""
            }
          />
          {isRefreshing ? "Refreshing…" : "Refresh capabilities"}
        </Button>
      </div>

      <details className="bg-surface-sunken border-hairline rounded-xl border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">
          Engine diagnostics
        </summary>
        {runtimes.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No yt-dlp engines were found.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {runtimes.map((runtime) => (
              <li key={runtime.id} className="text-caption">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{runtime.label}</span>
                  <span className="text-muted-foreground">
                    {runtime.version ?? "Version unavailable"}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {runtime.browsers.length > 0
                    ? runtime.browsers.map(browserLabel).join(", ")
                    : "No browser profiles"}
                </p>
                {runtime.error && (
                  <p className="text-destructive">{runtime.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
