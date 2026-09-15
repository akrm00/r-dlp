import type { ReactNode } from "react";
import { FolderOpen, Pause, Play, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShowInFolder } from "../hooks/useShowInFolder";
import { isRestartable, isStoppable } from "../services/downloadService";
import { useDownloads } from "../state/downloadsContext";
import type { DownloadItem } from "../types";

type DownloadRowActionsProps = {
  item: DownloadItem;
};

export function DownloadRowActions({ item }: DownloadRowActionsProps) {
  const { pauseDownload, cancelDownload, resumeDownload, removeDownload } =
    useDownloads();
  const showInFolder = useShowInFolder();

  const isRunning = isStoppable(item.status);
  const isPaused = item.status === "paused";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {isRunning && (
        <>
          <ActionButton
            label="Pause"
            description={`Pause ${item.title}`}
            icon={<Pause />}
            onClick={() => void pauseDownload(item.id)}
          />
          <ActionButton
            label="Cancel"
            description={`Cancel ${item.title}`}
            icon={<X />}
            onClick={() => void cancelDownload(item.id)}
          />
        </>
      )}

      {isRestartable(item.status) && (
        <ActionButton
          label={isPaused ? "Resume" : "Retry"}
          description={`${isPaused ? "Resume" : "Retry"} ${item.title}`}
          icon={isPaused ? <Play /> : <RotateCcw />}
          onClick={() => resumeDownload(item)}
        />
      )}

      {item.status === "completed" && (
        <ActionButton
          label="Show in folder"
          description={`Show ${item.title} in folder`}
          icon={<FolderOpen />}
          onClick={() => void showInFolder(item.savePath)}
        />
      )}

      {!isRunning && (
        <ActionButton
          label="Remove"
          description={`Remove ${item.title} from the list`}
          icon={<Trash2 />}
          onClick={() => removeDownload(item)}
        />
      )}
    </div>
  );
}

type ActionButtonProps = {
  /** Short text for the tooltip. */
  label: string;
  /** Full sentence for screen readers, which have no row context. */
  description: string;
  icon: ReactNode;
  onClick: () => void;
};

function ActionButton({
  label,
  description,
  icon,
  onClick,
}: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onClick}
          aria-label={description}
          className="size-7 [&_svg:not([class*='size-'])]:size-3.5"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
