import { useState } from "react";
import { Loader2, Search } from "lucide-react";
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type="url"
          placeholder="Paste a video or audio URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          aria-label="Video or audio URL"
          className="pr-4"
        />
      </div>
      <Button type="submit" disabled={isLoading || !url.trim()}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        Analyze
      </Button>
    </form>
  );
}
