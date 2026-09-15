import type { AttemptProgress } from "../types/execution";

export function formatAttempt(attempt: AttemptProgress): string {
  const browser = attempt.browser;
  const method = browser
    ? `${browser.charAt(0).toUpperCase()}${browser.slice(1)} impersonation`
    : "a standard request";
  return `Trying ${method}… (attempt ${attempt.attempt})`;
}
