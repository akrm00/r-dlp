import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/shared/components/Header";
import { SetupScreen } from "@/features/setup";
import { DownloadsProvider } from "@/features/downloads";
import { MainTabs } from "@/pages/MainTabs";
import { invokeCommand } from "@/shared/lib/tauriClient";
import type { YtdlpStatus } from "@/features/setup/types";

type AppState =
  | { status: "checking" }
  | { status: "setup" }
  | { status: "ready" };

export default function App() {
  const [appState, setAppState] = useState<AppState>({ status: "checking" });
  const [resetKey, setResetKey] = useState(0);

  const handleLogoClick = () => {
    setResetKey((k) => k + 1);
  };

  useEffect(() => {
    invokeCommand<YtdlpStatus>("check_ytdlp_status")
      .then((result) => {
        setAppState({ status: result.installed ? "ready" : "setup" });
      })
      .catch(() => {
        setAppState({ status: "setup" });
      });
  }, []);

  const handleSetupComplete = () => {
    setAppState({ status: "ready" });
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {/* Every spring in the app degrades to a cross-fade when the user has
          asked for reduced motion. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <DownloadsProvider>
            <div className="bg-background text-foreground flex min-h-screen flex-col">
              {appState.status === "ready" ? (
                // The tabs own the header so their triggers can sit in it.
                <MainTabs searchKey={resetKey} onLogoClick={handleLogoClick} />
              ) : (
                <>
                  <Header onLogoClick={handleLogoClick} />
                  <main className="flex-1">
                    {appState.status === "checking" && (
                      <div className="flex items-center justify-center py-24">
                        <p className="text-muted-foreground text-body">
                          Loading…
                        </p>
                      </div>
                    )}
                    {appState.status === "setup" && (
                      <SetupScreen onComplete={handleSetupComplete} />
                    )}
                  </main>
                </>
              )}
            </div>
          </DownloadsProvider>
        </TooltipProvider>
      </MotionConfig>
      <Toaster />
    </ThemeProvider>
  );
}
