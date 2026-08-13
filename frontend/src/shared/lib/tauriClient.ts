import { invoke } from "@tauri-apps/api/core";

export class TauriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TauriError";
  }
}

/** Turn an unknown thrown value into a message that can be shown to the user. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TauriError && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export async function invokeCommand<TResult>(
  command: string,
  args?: Record<string, unknown>,
): Promise<TResult> {
  try {
    return await invoke<TResult>(command, args);
  } catch (error) {
    if (typeof error === "string") {
      throw new TauriError(error);
    }
    throw new TauriError(
      error instanceof Error ? error.message : "An unknown error occurred",
    );
  }
}
