import { formatValue } from "../core/formatter";
import { createAccent } from "../core/styler";
import type { Styler } from "../core/types";
import { ConsoleTransport } from "../transports/console";
import { TransportManager } from "../transports/manager";
import type {
  FormattedLogRecord,
  LogRecord,
  LogTransport,
} from "../transports/types";
import { isLogLevelEnabled, type LogLevel } from "./levels";
import { defaultTheme, type LoggerTheme } from "./theme";

type ActiveLogLevel = Exclude<LogLevel, "silent">;

export interface LoggerOptions {
  readonly enabled?: boolean;
  readonly level?: LogLevel;
  readonly scope?: string;
  readonly timestamps?: boolean;
  readonly icons?: boolean;
  readonly colors?: boolean;
  readonly theme?: LoggerTheme;
  readonly transports?: readonly LogTransport[];
  readonly context?: Readonly<Record<string, unknown>>;
}

/**
 * Internal normalized configuration.
 *
 * Unlike LoggerOptions, every property exists here.
 * Optional public properties such as `scope` become `string | undefined`.
 */
interface ResolvedLoggerOptions {
  readonly enabled: boolean;
  readonly level: LogLevel;
  readonly scope: string | undefined;
  readonly timestamps: boolean;
  readonly icons: boolean;
  readonly colors: boolean;
  readonly theme: LoggerTheme;
  readonly transports: readonly LogTransport[];
  readonly context: Readonly<Record<string, unknown>>;
}

export interface TimerResult {
  readonly label: string;
  readonly durationMs: number;
}

export interface LogTimer {
  end(...values: readonly unknown[]): TimerResult;
}

export interface Logger {
  fatal(...values: readonly unknown[]): void;
  error(...values: readonly unknown[]): void;
  warn(...values: readonly unknown[]): void;
  success(...values: readonly unknown[]): void;
  info(...values: readonly unknown[]): void;
  debug(...values: readonly unknown[]): void;
  trace(...values: readonly unknown[]): void;

  scope(name: string): Logger;
  child(options: LoggerOptions): Logger;
  withContext(context: Readonly<Record<string, unknown>>): Logger;
  time(label?: string): LogTimer;

  flush(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Converts normalized internal options back into valid public LoggerOptions.
 *
 * With exactOptionalPropertyTypes enabled, optional properties must be omitted
 * rather than included with an explicit undefined value.
 */
function toLoggerOptions(
  resolved: ResolvedLoggerOptions,
  overrides: LoggerOptions = {},
): LoggerOptions {
  const scope =
    overrides.scope !== undefined ? overrides.scope : resolved.scope;

  return {
    enabled: overrides.enabled ?? resolved.enabled,
    level: overrides.level ?? resolved.level,
    timestamps: overrides.timestamps ?? resolved.timestamps,
    icons: overrides.icons ?? resolved.icons,
    colors: overrides.colors ?? resolved.colors,
    theme: overrides.theme ?? resolved.theme,
    transports: overrides.transports ?? resolved.transports,
    context: overrides.context ?? resolved.context,

    ...(scope !== undefined ? { scope } : {}),
  };
}

/**
 * Applies logger theme styles such as red, bold, or bgRed.
 */
function applyThemeStyles(
  accent: Styler,
  styleNames: readonly string[],
  text: string,
): string {
  let current = accent;

  for (const styleName of styleNames) {
    const style = current[styleName as keyof Styler];

    if (typeof style !== "function") {
      throw new TypeError(`Unknown logAccent theme style "${styleName}".`);
    }

    current = style as Styler;
  }

  return current(text);
}

/**
 * Converts a structured LogRecord into its printable representation.
 */
function formatRecord(
  record: LogRecord,
  options: Required<
    Pick<LoggerOptions, "timestamps" | "icons" | "colors" | "theme">
  >,
): FormattedLogRecord {
  const accent = createAccent({
    enabled: options.colors,
  });

  const theme = options.theme[record.level];
  const parts: string[] = [];

  if (options.timestamps) {
    parts.push(accent.gray(`[${record.timestamp.toISOString()}]`));
  }

  if (record.scope) {
    parts.push(accent.cyan.bold(`[${record.scope}]`));
  }

  const levelText = [options.icons ? theme.icon : "", theme.label]
    .filter(Boolean)
    .join(" ");

  parts.push(applyThemeStyles(accent, theme.styles, levelText));

  if (record.message.length > 0) {
    parts.push(record.message);
  }

  if (record.data.length > 0) {
    parts.push(record.data.map((value) => formatValue(value)).join(" "));
  }

  if (record.context && Object.keys(record.context).length > 0) {
    parts.push(accent.dim(formatValue(record.context)));
  }

  return {
    ...record,
    formattedMessage: parts.join(" "),
  };
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const resolved: ResolvedLoggerOptions = {
    enabled: options.enabled ?? true,
    level: options.level ?? "debug",
    scope: options.scope,
    timestamps: options.timestamps ?? true,
    icons: options.icons ?? true,
    colors: options.colors ?? true,
    theme: options.theme ?? defaultTheme,
    transports: options.transports ?? [new ConsoleTransport()],
    context: options.context ?? {},
  };

  const transportManager = new TransportManager(resolved.transports);

  function write(level: ActiveLogLevel, values: readonly unknown[]): void {
    if (!resolved.enabled || !isLogLevelEnabled(level, resolved.level)) {
      return;
    }

    const [firstValue, ...remainingValues] = values;

    const message =
      firstValue === undefined
        ? ""
        : typeof firstValue === "string"
          ? firstValue
          : formatValue(firstValue);

    const record: LogRecord = {
      level,
      timestamp: new Date(),
      message,
      data: remainingValues,

      ...(resolved.scope !== undefined ? { scope: resolved.scope } : {}),

      ...(Object.keys(resolved.context).length > 0
        ? { context: resolved.context }
        : {}),
    };

    const formattedRecord = formatRecord(record, {
      timestamps: resolved.timestamps,
      icons: resolved.icons,
      colors: resolved.colors,
      theme: resolved.theme,
    });

    void transportManager.write(formattedRecord);
  }

  const logger: Logger = {
    fatal(...values) {
      write("fatal", values);
    },

    error(...values) {
      write("error", values);
    },

    warn(...values) {
      write("warn", values);
    },

    success(...values) {
      write("success", values);
    },

    info(...values) {
      write("info", values);
    },

    debug(...values) {
      write("debug", values);
    },

    trace(...values) {
      write("trace", values);
    },

    scope(name) {
      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new TypeError("Logger scope cannot be empty.");
      }

      const nextScope = resolved.scope
        ? `${resolved.scope}:${normalizedName}`
        : normalizedName;

      return createLogger(
        toLoggerOptions(resolved, {
          scope: nextScope,
        }),
      );
    },

    child(childOptions) {
      const childContext = {
        ...resolved.context,
        ...(childOptions.context ?? {}),
      };

      return createLogger(
        toLoggerOptions(resolved, {
          ...childOptions,
          context: childContext,
        }),
      );
    },

    withContext(context) {
      return createLogger(
        toLoggerOptions(resolved, {
          context: {
            ...resolved.context,
            ...context,
          },
        }),
      );
    },

    time(label = "operation") {
      const normalizedLabel = label.trim() || "operation";
      const startedAt = process.hrtime.bigint();

      let ended = false;

      return {
        end(...values): TimerResult {
          if (ended) {
            throw new Error(`Timer "${normalizedLabel}" has already ended.`);
          }

          ended = true;

          const durationNanoseconds = process.hrtime.bigint() - startedAt;

          const durationMs = Number(durationNanoseconds) / 1_000_000;

          write("success", [
            `${normalizedLabel} completed in ${durationMs.toFixed(2)}ms`,
            ...values,
          ]);

          return {
            label: normalizedLabel,
            durationMs,
          };
        },
      };
    },

    async flush() {
      await transportManager.flush();
    },

    async close() {
      await transportManager.close();
    },
  };

  return Object.freeze(logger);
}

export const logger = createLogger({
  level:
    typeof process !== "undefined" && process.env.NODE_ENV === "production"
      ? "warn"
      : "debug",
});
