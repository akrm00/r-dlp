import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        url: video.sourceUrl,
        formatId,
        formatLabel: getFormatDescription(format),
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Download Video or Audio</CardTitle>
        </CardHeader>
        <CardContent>
          <UrlInputSection
            onAnalyze={analyze}
            isLoading={state.status === "loading"}
          />
        </CardContent>
      </Card>

      {state.status === "loading" && <AnalyzeLoadingSkeleton />}

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "success" && (
        <>
          <VideoInfoCard video={state.data} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Available Formats</h2>
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
        </>
      )}

      {state.status === "idle" && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Paste a URL above and click Analyze to get started.
        </p>
      )}
    </div>
  );
}
