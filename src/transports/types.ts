import type { LogLevel } from "../logger/levels";

export type ActiveLogLevel = Exclude<LogLevel, "silent">;

export interface LogRecord {
  readonly level: ActiveLogLevel;
  readonly timestamp: Date;
  readonly scope?: string;
  readonly message: string;
  readonly data: readonly unknown[];
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface FormattedLogRecord extends LogRecord {
  readonly formattedMessage: string;
}

export interface LogTransport {
  readonly name: string;

  write(
    record: FormattedLogRecord,
  ): void | Promise<void>;

  flush?(): void | Promise<void>;

  close?(): void | Promise<void>;
}

export interface TransportOptions {
  readonly enabled?: boolean;
}