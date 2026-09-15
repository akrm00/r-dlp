import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useSettingsDialog } from "../hooks/useSettingsDialog";
import { SettingsDialog } from "./SettingsDialog";

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const state = useSettingsDialog(isOpen);
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && state.isSaving) return;
    setIsOpen(nextOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <SettingsDialog state={state} onCancel={() => handleOpenChange(false)} />
    </Dialog>
  );
}
