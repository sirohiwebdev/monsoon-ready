export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";

const minPriority = LEVEL_PRIORITY[minLevel] ?? LEVEL_PRIORITY.info;

function timestamp(): string {
  return new Date().toISOString();
}

function emit(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] > minPriority) return;

  const entry: Record<string, unknown> = {
    ts: timestamp(),
    level,
    scope,
    msg: message,
  };
  if (meta) Object.assign(entry, meta);

  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export function createLogger(scope: string) {
  return {
    error: (message: string, meta?: Record<string, unknown>) => emit("error", scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => emit("warn", scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => emit("info", scope, message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => emit("debug", scope, message, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
