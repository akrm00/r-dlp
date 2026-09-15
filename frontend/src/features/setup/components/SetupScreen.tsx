import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SPRING } from "@/shared/motion/springs";
import { useYtdlpSetup } from "../hooks/useYtdlpSetup";

type SetupScreenProps = {
  onComplete: () => void;
};

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const { state, install, reset } = useYtdlpSetup();

  return (
    <div className="flex items-center justify-center px-5 py-20">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING.gentle}
        className="bg-card border-hairline floating w-full max-w-sm rounded-2xl border p-7"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
            <Download className="size-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-title">One quick setup</h1>
            <p className="text-muted-foreground text-body">
              r-dlp uses yt-dlp to do the downloading. It installs in a few
              seconds and stays up to date.
            </p>
          </div>

          <div className="w-full space-y-3">
            {state.status === "idle" && (
              <Button onClick={install} className="w-full" size="lg">
                <Download className="size-4" />
                Install yt-dlp
              </Button>
            )}

            {state.status === "installing" && (
              <Button disabled className="w-full" size="lg">
                <Loader2 className="size-4 animate-spin" />
                Downloading…
              </Button>
            )}

            {state.status === "error" && (
              <>
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
                <Button onClick={reset} variant="outline" className="w-full">
                  Try again
                </Button>
              </>
            )}

            {state.status === "success" && (
              <>
                <Alert variant="success">
                  <CheckCircle2 />
                  <AlertDescription>
                    yt-dlp {state.version} is ready.
                  </AlertDescription>
                </Alert>
                <Button onClick={onComplete} className="w-full" size="lg">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
