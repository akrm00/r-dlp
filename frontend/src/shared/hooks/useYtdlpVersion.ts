"use client";

import { useEffect, useState } from "react";
import { get } from "@/shared/lib/apiClient";
import type { VersionResponse } from "@/shared/types/api";

const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedVersion: string | null = null;
let cacheTimestamp = 0;

export function useYtdlpVersion() {
  const [version, setVersion] = useState<string | null>(cachedVersion);
  const [isLoading, setIsLoading] = useState(!cachedVersion);

  useEffect(() => {
    const now = Date.now();
    if (cachedVersion && now - cacheTimestamp < CACHE_DURATION_MS) {
      setVersion(cachedVersion);
      setIsLoading(false);
      return;
    }

    get<VersionResponse>("/api/version")
      .then((res) => {
        cachedVersion = res.data.version;
        cacheTimestamp = Date.now();
        setVersion(res.data.version);
      })
      .catch(() => {
        setVersion(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { version, isLoading } as const;
}
