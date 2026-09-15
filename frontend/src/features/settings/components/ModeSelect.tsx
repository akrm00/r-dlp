import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImpersonationMode } from "../types";

const MODE_OPTIONS: { value: ImpersonationMode; label: string }[] = [
  { value: "automatic", label: "Automatic" },
  { value: "always", label: "Always impersonate" },
  { value: "never", label: "Never impersonate" },
];

type ModeSelectProps = {
  label: string;
  value: ImpersonationMode;
  onChange: (value: ImpersonationMode) => void;
};

export function ModeSelect({ label, value, onChange }: ModeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ImpersonationMode)}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
