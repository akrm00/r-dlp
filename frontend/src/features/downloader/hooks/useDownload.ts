"use client";

import { useCallback } from "react";
import { useAuthContext } from "@/features/auth";
import { API_BASE_URL } from "@/shared/constants";
import { toast } from "sonner";

export function useDownload() {
  const { getAccessToken } = useAuthContext();

  const download = useCallback(
    async (url: string, formatId: string) => {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }

      const downloadUrl = new URL(`${API_BASE_URL}/api/download`);
      downloadUrl.searchParams.set("url", url);
      downloadUrl.searchParams.set("format", formatId);
      downloadUrl.searchParams.set("token", token);

      const anchor = document.createElement("a");
      anchor.href = downloadUrl.toString();
      anchor.download = "";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      toast.success("Download started");
    },
    [getAccessToken],
  );

  return { download } as const;
}
