type LogMeta = Record<string, unknown>;

function formatMessage(level: string, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    // eslint-disable-next-line no-console
    console.info(formatMessage("INFO", message, meta));
  },

  warn(message: string, meta?: LogMeta): void {
    // eslint-disable-next-line no-console
    console.warn(formatMessage("WARN", message, meta));
  },

  error(message: string, error?: unknown, meta?: LogMeta): void {
    const errorMeta: LogMeta = { ...meta };
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    }
    // eslint-disable-next-line no-console
    console.error(formatMessage("ERROR", message, errorMeta));
  },
};
