const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Format a byte count with the largest unit that keeps it readable. */
export function formatBytes(bytes: number): string {
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${BYTE_UNITS[unitIndex]}`;
}
