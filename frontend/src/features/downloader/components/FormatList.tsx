import { Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBitrate, formatFileSize } from "../services/formatService";
import type { VideoFormat } from "@/shared/types/api";

type FormatListProps = {
  formats: VideoFormat[];
  onDownload: (formatId: string) => void;
  /** Format currently waiting for its save location, if any. */
  pendingFormatId: string | null;
};

export function FormatList({
  formats,
  onDownload,
  pendingFormatId,
}: FormatListProps) {
  if (formats.length === 0) {
    return (
      <p className="text-muted-foreground text-body py-10 text-center">
        No formats match this filter.
      </p>
    );
  }

  return (
    <div className="bg-card border-hairline floating overflow-hidden rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Quality</TableHead>
            <TableHead>Format</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Bitrate
            </TableHead>
            <TableHead className="w-14 pr-4">
              <span className="sr-only">Download</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formats.map((format) => (
            <FormatRow
              key={format.formatId}
              format={format}
              onDownload={onDownload}
              isPending={pendingFormatId === format.formatId}
              isDisabled={pendingFormatId !== null}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type FormatRowProps = {
  format: VideoFormat;
  onDownload: (formatId: string) => void;
  isPending: boolean;
  isDisabled: boolean;
};

function FormatRow({
  format,
  onDownload,
  isPending,
  isDisabled,
}: FormatRowProps) {
  const isAudioOnly = format.hasAudio && !format.hasVideo;
  const codecs = [format.videoCodec, format.audioCodec]
    .filter((codec): codec is string => Boolean(codec))
    .map((codec) => codec.split(".")[0])
    .join(" · ");

  return (
    <TableRow>
      <TableCell className="pl-4">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">
            {format.resolution ?? (isAudioOnly ? "Audio" : "—")}
          </span>
          {format.fps && format.fps > 30 && (
            <span className="text-muted-foreground tabular text-caption">
              {format.fps}fps
            </span>
          )}
          {format.hasVideo && format.hasAudio && (
            <Badge variant="secondary">A+V</Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-caption uppercase">
            {format.extension}
          </span>
          {codecs && (
            <span className="text-muted-foreground hidden font-mono text-caption sm:inline">
              {codecs}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="tabular text-muted-foreground text-right text-caption">
        {formatFileSize(format.filesize)}
      </TableCell>

      <TableCell className="tabular text-muted-foreground hidden text-right text-caption sm:table-cell">
        {formatBitrate(format.audioBitrate ?? format.videoBitrate ?? null)}
      </TableCell>

      <TableCell className="pr-4 text-right">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onDownload(format.formatId)}
          disabled={isDisabled}
          aria-label={`Download ${format.resolution ?? "audio"} ${format.extension}`}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
