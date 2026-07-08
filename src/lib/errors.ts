export interface CommandError {
  code: string;
  message: string;
}

export const ErrorCodes = {
  NOT_FOUND: "not_found",
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict",
  DATABASE_ERROR: "database_error",
  INTERNAL_ERROR: "internal_error",
} as const;

export function parseCommandError(error: unknown): CommandError {
  if (typeof error === "string") {
    try {
      return JSON.parse(error) as CommandError;
    } catch {
      return { code: "unknown", message: error };
    }
  }
  return { code: "unknown", message: String(error) };
}
