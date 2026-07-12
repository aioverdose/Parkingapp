export function logError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[SpotMatch] ${message}`, {
    stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export function logApiError(
  route: string,
  error: unknown,
  userId?: string,
) {
  logError(error, { route, userId });
}
