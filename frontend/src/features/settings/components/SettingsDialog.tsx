import { AlertCircle, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useSettingsDialog } from "../hooks/useSettingsDialog";
import { SettingsForm } from "./SettingsForm";

type SettingsState = ReturnType<typeof useSettingsDialog>;

type SettingsDialogProps = {
  state: SettingsState;
  onCancel: () => void;
};

export function SettingsDialog({ state, onCancel }: SettingsDialogProps) {
  let body;
  if (state.isLoading) {
    body = (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
        Loading settings…
      </div>
    );
  } else if (state.loadError) {
    body = (
      <div className="space-y-4 py-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.loadError}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={state.load}>
          Try again
        </Button>
      </div>
    );
  } else {
    body = <SettingsForm state={state} onCancel={onCancel} />;
  }

  return (
    <DialogContent className="bg-surface-overlay floating max-h-[min(90vh,48rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-3xl">
      <DialogHeader className="border-hairline border-b px-6 py-5 pr-12">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>
          Control when r-dlp uses a browser identity for compatible sites.
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="p-6">{body}</div>
      </div>
    </DialogContent>
  );
}
