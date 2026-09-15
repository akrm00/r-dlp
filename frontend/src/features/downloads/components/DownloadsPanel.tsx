import { AnimatePresence } from "motion/react";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
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
    <section aria-labelledby="downloads-heading" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 id="downloads-heading" className="text-display">
            Downloads
          </h1>
          <p className="text-muted-foreground text-body">
            Three run at a time; the rest start automatically as slots free up.
          </p>
        </div>

        {hasClearableItems && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearFinished}
          >
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
      <EmptyState
        icon={ArrowDownToLine}
        title="No downloads yet"
        description="Pick a format on the Analyze tab and it will appear here with live progress."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {/* Rows spring in and out, and `layout` on each row makes the rest slide
          up when one leaves rather than teleporting. */}
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <DownloadRow
            key={item.id}
            item={item}
            queuePosition={getQueuePosition(items, item.id)}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}
