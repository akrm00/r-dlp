import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  computePercent,
  formatEta,
  formatSpeed,
  formatTransferred,
  getFileName,
} from "../services/downloadService";
import { DownloadRowActions } from "./DownloadRowActions";
import { DownloadStatusBadge } from "./DownloadStatusBadge";
import type { DownloadItem } from "../types";

const NO_PROGRESS_BAR: readonly string[] = ["failed", "cancelled"];

type DownloadRowProps = {
  item: DownloadItem;
  /** 1-based place in the waiting line, when the download is queued. */
  queuePosition: number | null;
};

export function DownloadRow({ item, queuePosition }: DownloadRowProps) {
  const percent = computePercent(item);
  const hasProgressBar = !NO_PROGRESS_BAR.includes(item.status);

  return (
    <li className="flex gap-3 rounded-lg border bg-card p-3">
      {item.thumbnailUrl && (
        <img
          src={item.thumbnailUrl}
          alt=""
          width={112}
          height={63}
          loading="lazy"
          className="hidden h-[63px] w-28 shrink-0 rounded-md object-cover sm:block"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.title}>
              {item.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="max-w-44 truncate font-mono text-xs"
                title={item.formatLabel}
              >
                {item.formatLabel}
              </Badge>
              <span
                className="truncate text-xs text-muted-foreground"
                title={item.savePath}
              >
                {getFileName(item.savePath)}
              </span>
            </div>
          </div>

          <DownloadStatusBadge status={item.status} />
          <DownloadRowActions item={item} />
        </div>

        {hasProgressBar && (
          <div className="flex items-center gap-3">
            <Progress
              value={percent}
              aria-label={`Download progress for ${item.title}`}
              className="flex-1"
            />
            <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {percent === null ? "—" : `${percent}%`}
            </span>
          </div>
        )}

        <DownloadDetails item={item} queuePosition={queuePosition} />
      </div>
    </li>
  );
}

type DownloadDetailsProps = {
  item: DownloadItem;
  queuePosition: number | null;
};

function DownloadDetails({ item, queuePosition }: DownloadDetailsProps) {
  if (item.status === "failed") {
    return (
      <p className="text-xs text-destructive">
        {item.errorMessage ?? "Download failed. Please try again."}
      </p>
    );
  }

  if (item.status === "queued") {
    return (
      <p className="text-xs text-muted-foreground">
        {queuePosition === null
          ? "Waiting to start…"
          : `Waiting to start — position ${queuePosition} in queue`}
      </p>
    );
  }

  if (item.status === "cancelled") {
    return (
      <p className="text-xs text-muted-foreground">
        Cancelled before it finished.
      </p>
    );
  }

  if (item.status === "completed") {
    return (
      <p className="truncate text-xs text-muted-foreground" title={item.savePath}>
        Saved to {item.savePath}
      </p>
    );
  }

  return (
    <p className="font-mono text-xs text-muted-foreground">
      {formatTransferred(item)}
      {item.status === "downloading" && (
        <>
          {" · "}
          {formatSpeed(item.speedBytesPerSec)}
          {" · "}
          {formatEta(item.etaSeconds)} left
        </>
      )}
      {item.fragmentCount !== null && (
        <>
          {" · "}
          fragment {item.fragmentIndex ?? 0}/{item.fragmentCount}
        </>
      )}
    </p>
  );
}
