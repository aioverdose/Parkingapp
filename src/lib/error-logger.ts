import { logger } from "@/lib/logger";

export function logError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(message, { ...context, stack });
}

export function logApiError(
  route: string,
  error: unknown,
  userId?: string,
) {
  logError(error, { route, userId });
}
