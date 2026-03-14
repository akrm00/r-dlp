import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "./ThemeToggle";
import { useYtdlpVersion } from "@/shared/hooks/useYtdlpVersion";

export function Header() {
  const { version, isLoading: isVersionLoading } = useYtdlpVersion();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">r-dlp</span>
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
