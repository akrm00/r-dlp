import { motion } from "motion/react";
import { Progress } from "@/components/ui/progress";
import { SPRING } from "@/shared/motion/springs";
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
import { formatAttempt } from "@/shared/utils/execution";

/** Statuses with nothing left to show on a bar. */
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
    <motion.li
      layout
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={SPRING.default}
      className="bg-card border-hairline floating flex gap-3.5 rounded-2xl border p-3.5"
    >
      {item.thumbnailUrl && (
        <img
          src={item.thumbnailUrl}
          alt=""
          width={112}
          height={63}
          loading="lazy"
          className="border-hairline hidden h-[63px] w-28 shrink-0 rounded-lg border object-cover sm:block"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-body truncate font-medium" title={item.title}>
              {item.title}
            </p>
            <p
              className="text-muted-foreground mt-0.5 truncate text-caption"
              title={item.savePath}
            >
              {item.formatLabel} · {getFileName(item.savePath)}
            </p>
          </div>

          <DownloadStatusBadge status={item.status} />
          <DownloadRowActions item={item} />
        </div>

        {hasProgressBar && (
          <div className="flex items-center gap-3">
            <Progress
              value={percent}
              tone={item.status === "completed" ? "success" : "default"}
              aria-label={`Download progress for ${item.title}`}
              className="flex-1"
            />
            <motion.span
              layout="position"
              transition={SPRING.default}
              className="text-muted-foreground tabular w-10 shrink-0 text-right text-caption"
            >
              {percent === null ? "—" : `${percent}%`}
            </motion.span>
          </div>
        )}

        <DownloadDetails item={item} queuePosition={queuePosition} />
      </div>
    </motion.li>
  );
}

type DownloadDetailsProps = {
  item: DownloadItem;
  queuePosition: number | null;
};

function DownloadDetails({ item, queuePosition }: DownloadDetailsProps) {
  if (item.status === "retrying" && item.attempt) {
    return (
      <p role="status" className="text-muted-foreground text-caption">
        {formatAttempt(item.attempt)}
      </p>
    );
  }
  if (item.status === "failed") {
    return (
      <p className="text-destructive text-caption">
        {item.errorMessage ?? "Download failed. Please try again."}
      </p>
    );
  }

  if (item.status === "queued") {
    return (
      <p className="text-muted-foreground text-caption">
        {queuePosition === null
          ? "Waiting to start…"
          : `Waiting to start — number ${queuePosition} in the queue`}
      </p>
    );
  }

  if (item.status === "cancelled") {
    return (
      <p className="text-muted-foreground text-caption">
        Cancelled before it finished.
      </p>
    );
  }

  if (item.status === "completed") {
    return (
      <p className="text-muted-foreground tabular truncate text-caption">
        {formatTransferred(item)} · saved
      </p>
    );
  }

  return (
    <p className="text-muted-foreground tabular text-caption">
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
