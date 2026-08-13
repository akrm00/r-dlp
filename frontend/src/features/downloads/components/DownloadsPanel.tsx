import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQueuePosition,
  summarizeDownloads,
} from "../services/downloadService";
import { useDownloads } from "../state/downloadsContext";
import { DownloadRow } from "./DownloadRow";
import type { DownloadItem } from "../types";

const CLEARABLE_STATUSES: readonly string[] = [
  "completed",
  "failed",
  "cancelled",
];

export function DownloadsPanel() {
  const { items, clearFinished } = useDownloads();

  const hasClearableItems = items.some((item) =>
    CLEARABLE_STATUSES.includes(item.status),
  );

  return (
    <section aria-labelledby="downloads-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="downloads-heading" className="text-lg font-semibold">
          Downloads
        </h2>
        {hasClearableItems && (
          <Button type="button" variant="outline" size="sm" onClick={clearFinished}>
            Clear finished
          </Button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {summarizeDownloads(items)}
      </p>

      <DownloadsList items={items} />
    </section>
  );
}

type DownloadsListProps = {
  items: DownloadItem[];
};

function DownloadsList({ items }: DownloadsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <Download className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">No downloads yet</p>
          <p className="text-sm text-muted-foreground">
            Analyze a URL and pick a format — it will show up here with live
            progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <DownloadRow
          key={item.id}
          item={item}
          queuePosition={getQueuePosition(items, item.id)}
        />
      ))}
    </ul>
  );
}
