import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "./ThemeToggle";
import { useYtdlpVersion } from "@/shared/hooks/useYtdlpVersion";
import { useYtdlpUpdate } from "@/shared/hooks/useYtdlpUpdate";

type HeaderProps = {
  onLogoClick?: () => void;
  /** Section navigation, rendered next to the theme toggle. */
  nav?: ReactNode;
};

export function Header({ onLogoClick, nav }: HeaderProps) {
  const { version, isLoading: isVersionLoading } = useYtdlpVersion();
  const { state: updateState, checkNow, update } = useYtdlpUpdate();

  useEffect(() => {
    // Only worth checking once we know a version is actually installed.
    if (version) {
      checkNow();
    }
  }, [version, checkNow]);

  const updateAvailable =
    updateState.status === "available" || updateState.status === "updating";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="Go to home"
            className="flex cursor-pointer items-center gap-2 rounded-md p-1 transition-colors hover:text-foreground/80"
          >
            <Download className="h-5 w-5" />
            <span className="text-lg font-semibold tracking-tight">r-dlp</span>
          </button>
          {isVersionLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : version ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge
                    variant={updateAvailable ? "default" : "secondary"}
                    className="gap-1 font-mono text-xs"
                  >
                    {updateAvailable && <ArrowUpCircle className="h-3 w-3" />}
                    yt-dlp {version}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start">
                <UpdatePanel
                  state={updateState}
                  onCheck={() => checkNow(true)}
                  onUpdate={update}
                />
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {nav}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

type UpdatePanelProps = {
  state: ReturnType<typeof useYtdlpUpdate>["state"];
  onCheck: () => void;
  onUpdate: () => void;
};

function UpdatePanel({ state, onCheck, onUpdate }: UpdatePanelProps) {
  switch (state.status) {
    case "idle":
    case "checking":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for updates...
        </div>
      );

    case "up-to-date":
      if (!state.result.managed) {
        return (
          <p className="text-sm text-muted-foreground">
            This yt-dlp binary is managed outside of r-dlp, so automatic
            update checks aren't available for it.
          </p>
        );
      }
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            yt-dlp {state.result.currentVersion} is up to date.
          </div>
          <Button size="sm" variant="outline" onClick={onCheck} className="w-full">
            Check again
          </Button>
        </div>
      );

    case "available":
      return (
        <div className="space-y-3">
          <p className="text-sm">
            A new version is available:{" "}
            <span className="font-mono">{state.result.latestVersion}</span>{" "}
            <span className="text-muted-foreground">
              (current: {state.result.currentVersion})
            </span>
          </p>
          <Button size="sm" onClick={onUpdate} className="w-full">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Update now
          </Button>
        </div>
      );

    case "updating":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating to {state.result.latestVersion}...
        </div>
      );

    case "updated":
      return (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Updated to yt-dlp {state.version}.
        </div>
      );

    case "error":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {state.message}
          </div>
          <Button size="sm" variant="outline" onClick={onCheck} className="w-full">
            Try again
          </Button>
        </div>
      );
  }
}
