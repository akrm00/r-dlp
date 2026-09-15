import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { browserLabel } from "../services/settingsService";

const GLOBAL_BROWSER = "__global_browser__";

type BrowserSelectProps = {
  label: string;
  value: string | null;
  browsers: string[];
  allowGlobal?: boolean;
  onChange: (value: string | null) => void;
};

export function BrowserSelect({
  label,
  value,
  browsers,
  allowGlobal = false,
  onChange,
}: BrowserSelectProps) {
  const configuredBrowser = value && !browsers.includes(value) ? value : null;
  const options = configuredBrowser
    ? [configuredBrowser, ...browsers]
    : browsers;
  const selectValue = value ?? GLOBAL_BROWSER;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === GLOBAL_BROWSER ? null : next)}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowGlobal && (
          <SelectItem value={GLOBAL_BROWSER}>Use global browser</SelectItem>
        )}
        {options.map((browser) => (
          <SelectItem key={browser} value={browser}>
            {browserLabel(browser)}
            {browser === configuredBrowser ? " (unavailable)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
