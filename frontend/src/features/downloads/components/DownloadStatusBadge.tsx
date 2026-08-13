import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "../services/downloadService";
import type { DownloadStatus } from "../types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_VARIANTS: Record<DownloadStatus, BadgeVariant> = {
  queued: "outline",
  downloading: "default",
  processing: "default",
  paused: "secondary",
  completed: "secondary",
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
