import { useState } from "react";
import { Link2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UrlInputSectionProps = {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
};

export function UrlInputSection({ onAnalyze, isLoading }: UrlInputSectionProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onAnalyze(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
      <div className="relative flex-1">
        <Link2
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="url"
          placeholder="Paste a video or audio link…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          aria-label="Video or audio URL"
          className="pl-10"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isLoading || !url.trim()}
        // Fixed width so swapping the icon for a spinner cannot shift layout.
        className="sm:w-32"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
        {isLoading ? "Analyzing…" : "Analyze"}
      </Button>
    </form>
  );
}
