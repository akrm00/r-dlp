import { useEffect, useState } from "react";
import { fetchVersion } from "@/features/downloader/api/downloaderApi";

export function useYtdlpVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
      .finally(() => setIsLoading(false));
  }, []);

  return { version, isLoading } as const;
}
