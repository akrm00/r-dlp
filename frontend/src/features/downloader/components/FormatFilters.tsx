"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormatFilter } from "../services/formatService";

type FormatFiltersProps = {
  filter: FormatFilter;
  onFilterChange: (filter: FormatFilter) => void;
  videoCount: number;
  audioCount: number;
  totalCount: number;
};

export function FormatFilters({
  filter,
  onFilterChange,
  videoCount,
  audioCount,
  totalCount,
}: FormatFiltersProps) {
  return (
    <Tabs
      value={filter}
      onValueChange={(v) => onFilterChange(v as FormatFilter)}
    >
      <TabsList>
        <TabsTrigger value="all">
          All ({totalCount})
        </TabsTrigger>
        <TabsTrigger value="video">
          Video ({videoCount})
        </TabsTrigger>
        <TabsTrigger value="audio">
          Audio ({audioCount})
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
