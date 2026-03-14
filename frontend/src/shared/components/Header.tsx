import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "./ThemeToggle";
import { useYtdlpVersion } from "@/shared/hooks/useYtdlpVersion";

type HeaderProps = {
  onLogoClick?: () => void;
};

export function Header({ onLogoClick }: HeaderProps) {
  const { version, isLoading: isVersionLoading } = useYtdlpVersion();

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
            <Badge variant="secondary" className="font-mono text-xs">
              yt-dlp {version}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
