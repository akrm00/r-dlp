import { ExternalLink, Clock, Eye, User, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDuration,
  formatViewCount,
} from "../services/formatService";
import type { VideoInfo } from "@/shared/types/api";

type VideoInfoCardProps = {
  video: VideoInfo;
};

export function VideoInfoCard({ video }: VideoInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <CardTitle className="flex-1 text-lg leading-snug">
            {video.title}
          </CardTitle>
          <Badge variant="outline" className="shrink-0">
            <Globe className="mr-1 h-3 w-3" />
            {video.platform}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row">
          {video.thumbnailUrl && (
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md sm:w-64">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {video.uploader && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{video.uploader}</span>
              </div>
            )}
            {video.durationSeconds !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {video.durationFormatted ??
                    formatDuration(video.durationSeconds)}
                </span>
              </div>
            )}
            {video.viewCount !== null && (
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span>{formatViewCount(video.viewCount)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <a
              href={video.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View original
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
