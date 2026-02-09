"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  formatFileSize,
  formatBitrate,
} from "../services/formatService";
import type { VideoFormat } from "@/shared/types/api";

type FormatListProps = {
  formats: VideoFormat[];
  onDownload: (formatId: string) => void;
};

export function FormatList({ formats, onDownload }: FormatListProps) {
  if (formats.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No formats available for this filter.
      </p>
    );
  }

  return (
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Format</TableHead>
            <TableHead>Resolution</TableHead>
            <TableHead className="hidden sm:table-cell">Codec</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="hidden sm:table-cell">Bitrate</TableHead>
            <TableHead className="w-[100px]">
              <span className="sr-only">Download</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formats.map((format) => (
            <TableRow key={format.formatId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {format.extension}
                  </Badge>
                  {format.hasVideo && format.hasAudio && (
                    <Badge variant="secondary" className="text-xs">
                      A+V
                    </Badge>
                  )}
                  {format.hasAudio && !format.hasVideo && (
                    <Badge variant="secondary" className="text-xs">
                      Audio
                    </Badge>
                  )}
                  {format.hasVideo && !format.hasAudio && (
                    <Badge variant="secondary" className="text-xs">
                      Video
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {format.resolution ?? (format.hasAudio ? "Audio only" : "\u2014")}
                {format.fps && format.fps > 30 ? ` ${format.fps}fps` : ""}
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">
                {[format.videoCodec, format.audioCodec]
                  .filter(Boolean)
                  .map((c) => c!.split(".")[0])
                  .join(" + ") || "\u2014"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {formatFileSize(format.filesize)}
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">
                {formatBitrate(
                  format.audioBitrate ?? format.videoBitrate ?? null,
                )}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDownload(format.formatId)}
                  aria-label={`Download ${format.extension} ${format.resolution ?? "audio"}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
