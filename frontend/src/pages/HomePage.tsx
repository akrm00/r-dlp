import { useState } from "react";
import { motion } from "motion/react";
import { Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UrlInputSection,
  VideoInfoCard,
  FormatFilters,
  FormatList,
  AnalyzeLoadingSkeleton,
  useAnalyze,
  useFormatFilter,
} from "@/features/downloader";
import {
  filterFormats,
  getFormatDescription,
} from "@/features/downloader/services/formatService";
import { useDownloads } from "@/features/downloads";
import { EmptyState } from "@/shared/components/EmptyState";
import { SPRING } from "@/shared/motion/springs";
import { formatAttempt } from "@/shared/utils/execution";

type HomePageProps = {
  /** Called once a download has been queued, so the shell can reveal it. */
  onDownloadQueued: () => void;
};

export default function HomePage({ onDownloadQueued }: HomePageProps) {
  const { state, analyze } = useAnalyze();
  const { startDownload } = useDownloads();
  const [pendingFormatId, setPendingFormatId] = useState<string | null>(null);

  const formats = state.status === "success" ? state.data.formats : [];
  const { filteredFormats, filter, setFilter } = useFormatFilter(formats);

  const handleDownload = async (formatId: string) => {
    if (state.status !== "success") return;

    const video = state.data;
    const format = video.formats.find((item) => item.formatId === formatId);
    if (!format) return;

    setPendingFormatId(formatId);
    try {
      const downloadId = await startDownload({
        url: state.requestUrl,
        formatId,
        formatLabel: getFormatDescription(format),
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        executionContext: video.executionContext,
      });

      if (downloadId) {
        onDownloadQueued();
      }
    } finally {
      setPendingFormatId(null);
    }
  };

  const videoCount = filterFormats(formats, "video").length;
  const audioCount = filterFormats(formats, "audio").length;

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-display">Download video or audio</h1>
          <p className="text-muted-foreground text-body">
            Paste a link from YouTube, Twitch, X, or any of the thousand other
            sites yt-dlp supports.
          </p>
        </div>

        <UrlInputSection
          onAnalyze={analyze}
          isLoading={state.status === "loading"}
        />
      </section>

      {state.status === "loading" && <AnalyzeLoadingSkeleton />}
      {state.status === "loading" && state.attempt && (
        <p role="status" className="text-muted-foreground text-body">
          {formatAttempt(state.attempt)}
        </p>
      )}

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "success" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.gentle}
          className="space-y-6"
          aria-label="Analysis results"
        >
          <VideoInfoCard video={state.data} />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-heading">Available formats</h2>
              <FormatFilters
                filter={filter}
                onFilterChange={setFilter}
                videoCount={videoCount}
                audioCount={audioCount}
                totalCount={formats.length}
              />
            </div>
            <FormatList
              formats={filteredFormats}
              onDownload={handleDownload}
              pendingFormatId={pendingFormatId}
            />
          </div>
        </motion.section>
      )}

      {state.status === "idle" && (
        <EmptyState
          icon={Link2}
          title="Nothing analyzed yet"
          description="Paste a link above and every available quality will show up here."
        />
      )}
    </div>
  );
}
