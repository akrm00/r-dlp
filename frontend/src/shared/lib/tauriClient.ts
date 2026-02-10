import { invoke } from "@tauri-apps/api/core";

export class TauriError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TauriError";
  }
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
