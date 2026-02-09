const MAX_URL_LENGTH = 2048;

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^localhost$/i,
];

type ValidationResult =
  | { isValid: true; sanitizedUrl: string }
  | { isValid: false; error: string };

export function validateUrl(raw: string): ValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { isValid: false, error: "URL is required" };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: "Only HTTP and HTTPS URLs are supported" };
  }

  const hostname = parsed.hostname;
  const isPrivate = PRIVATE_IP_PATTERNS.some((pattern) =>
    pattern.test(hostname),
  );
  if (isPrivate) {
    return { isValid: false, error: "Private/internal URLs are not allowed" };
  }

  return { isValid: true, sanitizedUrl: parsed.href };
}
