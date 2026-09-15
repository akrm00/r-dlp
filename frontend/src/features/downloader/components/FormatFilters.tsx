import { Tabs } from "@/components/ui/tabs";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
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
      onValueChange={(value) => onFilterChange(value as FormatFilter)}
    >
      <SegmentedControl
        label="Filter formats"
        layoutId="format-filter"
        value={filter}
        items={[
          { value: "all", label: `All ${totalCount}` },
          { value: "video", label: `Video ${videoCount}` },
          { value: "audio", label: `Audio ${audioCount}` },
        ]}
      />
    </Tabs>
  );
}
