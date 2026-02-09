"use client";

import { Download, LogOut, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthContext } from "@/features/auth";
import { useYtdlpVersion } from "@/shared/hooks/useYtdlpVersion";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, isLoading: isAuthLoading, signOut } = useAuthContext();
  const { version, isLoading: isVersionLoading } = useYtdlpVersion();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">r-dlp</span>
          {isVersionLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : version ? (
            <Badge variant="secondary" className="text-xs font-mono">
              yt-dlp {version}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthLoading ? (
            <Skeleton className="h-9 w-9 rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="User menu">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
