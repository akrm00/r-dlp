import { useEffect, useState } from "react";
import { fetchYtdlpVersion } from "@/shared/services/ytdlpService";

export function useYtdlpVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchYtdlpVersion()
      .then(setVersion)
      .catch(() => setVersion(null))
      .finally(() => setIsLoading(false));
  }, []);

  return { version, isLoading } as const;
}
