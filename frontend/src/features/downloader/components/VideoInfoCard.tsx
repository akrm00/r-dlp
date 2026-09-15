import { Clock, ExternalLink, Eye, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatViewCount } from "../services/formatService";
import type { VideoInfo } from "@/shared/types/api";

type VideoInfoCardProps = {
  video: VideoInfo;
};

export function VideoInfoCard({ video }: VideoInfoCardProps) {
  const duration =
    video.durationFormatted ?? formatDuration(video.durationSeconds);

  return (
    <article className="bg-card border-hairline floating flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row">
      {video.thumbnailUrl && (
        <div className="border-hairline relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border sm:w-56">
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {duration && (
            <span className="tabular absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-caption font-medium text-white">
              {duration}
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <h3 className="text-title min-w-0 flex-1">{video.title}</h3>
          <Badge variant="outline" className="shrink-0">
            {video.platform}
          </Badge>
        </div>

        <dl className="text-muted-foreground text-caption flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {video.uploader && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Uploader</dt>
              <User className="size-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate">{video.uploader}</dd>
            </div>
          )}
          {video.durationSeconds !== null && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Duration</dt>
              <Clock className="size-3.5 shrink-0" aria-hidden="true" />
              <dd className="tabular">{duration}</dd>
            </div>
          )}
          {video.viewCount !== null && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Views</dt>
              <Eye className="size-3.5 shrink-0" aria-hidden="true" />
              <dd className="tabular">{formatViewCount(video.viewCount)}</dd>
            </div>
          )}
        </dl>

        <a
          href={video.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-auto inline-flex w-fit items-center gap-1.5 rounded-md text-caption transition-colors outline-none focus-visible:ring-[3px]"
        >
          <ExternalLink className="size-3" aria-hidden="true" />
          View original
        </a>
      </div>
    </article>
  );
}
