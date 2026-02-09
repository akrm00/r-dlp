"use client";

import { useMemo, useState } from "react";
import {
  filterFormats,
  sortFormats,
  type FormatFilter,
  type FormatSort,
} from "../services/formatService";
import type { VideoFormat } from "@/shared/types/api";

export function useFormatFilter(formats: VideoFormat[]) {
  const [filter, setFilter] = useState<FormatFilter>("all");
  const [sort, setSort] = useState<FormatSort>("quality");

  const filteredFormats = useMemo(
    () => sortFormats(filterFormats(formats, filter), sort),
    [formats, filter, sort],
  );

  return { filteredFormats, filter, setFilter, sort, setSort } as const;
}
