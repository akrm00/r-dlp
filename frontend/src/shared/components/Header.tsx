import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useScrolled } from "@/shared/hooks/useScrolled";
import { useYtdlpVersion } from "@/shared/hooks/useYtdlpVersion";

type HeaderProps = {
  onLogoClick?: () => void;
  /** Section navigation, rendered next to the theme toggle. */
  nav?: ReactNode;
  actions?: ReactNode;
};

export function Header({ onLogoClick, nav, actions }: HeaderProps) {
  const { version, isLoading: isVersionLoading } = useYtdlpVersion();
  const isScrolled = useScrolled();

  return (
    <header
      data-scrolled={isScrolled || undefined}
      className={cn(
        // A floating material layer: content passes underneath it rather than
        // being cut off by an opaque strip.
        "material sticky top-0 z-50 w-full",
        // Scroll edge effect: no divider at rest, a hairline and a soft shadow
        // only once content is actually sliding under the chrome.
        "border-b border-transparent transition-[border-color,box-shadow] duration-300 ease-out",
        "data-scrolled:border-hairline data-scrolled:shadow-[0_1px_12px_oklch(0_0_0_/_5%)]",
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="Go to home"
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 outline-none",
              "transition-[transform,opacity] duration-150 ease-out",
              "hover:opacity-80 active:scale-[0.97] active:duration-100",
              "focus-visible:ring-ring focus-visible:ring-[3px]",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
          >
            <Download className="size-[18px]" />
            <span className="text-title">r-dlp</span>
          </button>

          {isVersionLoading ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : version ? (
            <Badge variant="outline" className="tabular font-mono">
              yt-dlp {version}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {nav}
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
