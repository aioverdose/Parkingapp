import { createAdminClient } from "@/lib/supabaseAdmin";

export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeContext(context: LogContext): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      sanitized[key] = { message: value.message, stack: value.stack };
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else {
      try {
        JSON.stringify(value);
        sanitized[key] = value;
      } catch {
        sanitized[key] = String(value);
      }
    }
  }
  return sanitized;
}

function writeToConsole(level: LogLevel, message: string, context: LogContext): void {
  const line = safeJson({
    level,
    message,
    ...sanitizeContext(context),
    timestamp: new Date().toISOString(),
  });
  const prefix = "[ParkingMeeters]";
  switch (level) {
    case "error":
      console.error(`${prefix} ${line}`);
      break;
    case "warn":
      console.warn(`${prefix} ${line}`);
      break;
    default:
      console.log(`${prefix} ${line}`);
      break;
  }
}

async function persist(level: LogLevel, message: string, context: LogContext): Promise<void> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return;
  }
  try {
    const supabase = createAdminClient();
    await supabase.rpc("insert_app_log", {
      p_level: level,
      p_message: message,
      p_context: sanitizeContext(context),
      p_route: context.route ?? null,
      p_user_id: context.userId ?? null,
    });
  } catch {
    // Logging must never throw or affect the request that produced it.
  }
}

export function log(level: LogLevel, message: string, context: LogContext = {}): void {
  writeToConsole(level, message, context);
  void persist(level, message, context);
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context ?? {}),
  warn: (message: string, context?: LogContext) => log("warn", message, context ?? {}),
  error: (message: string, context?: LogContext) => log("error", message, context ?? {}),
};
