import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "../services/downloadService";
import type { DownloadStatus } from "../types";

type BadgeVariant =
  "default" | "secondary" | "outline" | "success" | "destructive";

/** Colour marks the outcome; everything still in flight stays neutral. */
const STATUS_VARIANTS: Record<DownloadStatus, BadgeVariant> = {
  queued: "outline",
  downloading: "secondary",
  retrying: "secondary",
  processing: "secondary",
  paused: "outline",
  completed: "success",
  failed: "destructive",
  cancelled: "outline",
};

type DownloadStatusBadgeProps = {
  status: DownloadStatus;
};

export function DownloadStatusBadge({ status }: DownloadStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="shrink-0">
      {getStatusLabel(status)}
    </Badge>
  );
}
