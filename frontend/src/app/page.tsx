"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UrlInputSection,
  VideoInfoCard,
  FormatFilters,
  FormatList,
  AnalyzeLoadingSkeleton,
  useAnalyze,
  useDownload,
  useFormatFilter,
} from "@/features/downloader";
import { filterFormats } from "@/features/downloader/services/formatService";

export default function HomePage() {
  const { state, analyze } = useAnalyze();
  const { download } = useDownload();
  const formats = state.status === "success" ? state.data.formats : [];
  const { filteredFormats, filter, setFilter } = useFormatFilter(formats);

  const handleDownload = (formatId: string) => {
    if (state.status !== "success") return;
    download(state.data.sourceUrl, formatId);
  };

  const videoCount = filterFormats(formats, "video").length;
  const audioCount = filterFormats(formats, "audio").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
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
