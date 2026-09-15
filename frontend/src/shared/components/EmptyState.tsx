import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

/** The resting state of a surface that has nothing to show yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-hairline flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-heading">{title}</p>
        <p className="text-muted-foreground text-body mx-auto max-w-xs">
          {description}
        </p>
      </div>
    </div>
  );
}
