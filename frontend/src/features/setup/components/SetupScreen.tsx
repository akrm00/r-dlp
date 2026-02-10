import { Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useYtdlpSetup } from "../hooks/useYtdlpSetup";

type SetupScreenProps = {
  onComplete: () => void;
};

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const { state, install, reset } = useYtdlpSetup();

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Download className="h-6 w-6" />
          </div>
          <CardTitle>Setup Required</CardTitle>
          <CardDescription>
            r-dlp needs yt-dlp to download videos. It will be installed
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === "idle" && (
            <Button onClick={install} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Install yt-dlp
            </Button>
          )}

          {state.status === "installing" && (
            <Button disabled className="w-full" size="lg">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading yt-dlp...
            </Button>
          )}

          {state.status === "error" && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <Button onClick={reset} variant="outline" className="w-full">
                Try Again
              </Button>
            </>
          )}

          {state.status === "success" && (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  yt-dlp {state.version} installed successfully.
                </AlertDescription>
              </Alert>
              <Button onClick={onComplete} className="w-full" size="lg">
                Get Started
              </Button>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            yt-dlp is an open-source tool for downloading media from thousands
            of sites.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
