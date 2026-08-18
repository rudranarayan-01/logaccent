import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type {
  FormattedLogRecord,
  LogTransport,
} from "./types";

export type FileLogFormat = "text" | "json";

export interface FileTransportOptions {
  readonly directory?: string;
  readonly filename?: string;
  readonly dailyRotate?: boolean;
  readonly format?: FileLogFormat;
  readonly separateErrorFile?: boolean;
  readonly enabled?: boolean;
}

interface ResolvedFileTransportOptions {
  readonly directory: string;
  readonly filename: string;
  readonly dailyRotate: boolean;
  readonly format: FileLogFormat;
  readonly separateErrorFile: boolean;
  readonly enabled: boolean;
}

export class FileTransport implements LogTransport {
  readonly name = "file";

  private readonly options: ResolvedFileTransportOptions;

  private readonly pendingWrites = new Set<Promise<void>>();

  private directoryReady: Promise<void> | undefined;

  private closed = false;

  constructor(
    options: FileTransportOptions = {},
  ) {
    this.options = {
      directory:
        options.directory ?? "./logs",

      filename:
        options.filename ?? "app",

      dailyRotate:
        options.dailyRotate ?? true,

      format:
        options.format ?? "text",

      separateErrorFile:
        options.separateErrorFile ?? false,

      enabled:
        options.enabled ?? true,
    };
  }

  write(
    record: FormattedLogRecord,
  ): Promise<void> {
    if (!this.options.enabled || this.closed) {
      return Promise.resolve();
    }

    const writePromise = this.writeRecord(record);

    this.pendingWrites.add(writePromise);

    void writePromise.finally(() => {
      this.pendingWrites.delete(writePromise);
    });

    return writePromise;
  }

  async flush(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.pendingWrites),
    );
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    await this.flush();

    this.closed = true;
  }

  private async writeRecord(
    record: FormattedLogRecord,
  ): Promise<void> {
    await this.ensureDirectory();

    const filename = this.resolveFilename(record);

    const filePath = path.join(
      this.options.directory,
      filename,
    );

    const content = `${this.serialize(record)}\n`;

    await appendFile(
      filePath,
      content,
      "utf8",
    );
  }

  private async ensureDirectory(): Promise<void> {
    if (!this.directoryReady) {
      this.directoryReady = mkdir(
        this.options.directory,
        {
          recursive: true,
        },
      ).then(() => undefined);
    }

    await this.directoryReady;
  }

  private resolveFilename(
    record: FormattedLogRecord,
  ): string {
    const date = this.formatDate(
      record.timestamp,
    );

    const baseName = this.options.filename;

    if (!this.options.dailyRotate) {
      if (this.options.separateErrorFile) {
        return this.isErrorLevel(record)
          ? `${baseName}.error.log`
          : `${baseName}.log`;
      }

      return `${baseName}.log`;
    }

    if (
      this.options.separateErrorFile &&
      this.isErrorLevel(record)
    ) {
      return `${baseName}-${date}.error.log`;
    }

    return `${baseName}-${date}.log`;
  }

  private serialize(
    record: FormattedLogRecord,
  ): string {
    if (this.options.format === "json") {
      return JSON.stringify(
        this.toSerializableRecord(record),
      );
    }

    return record.formattedMessage;
  }

  private toSerializableRecord(
    record: FormattedLogRecord,
  ): Record<string, unknown> {
    return {
      timestamp:
        record.timestamp.toISOString(),

      level:
        record.level,

      ...(record.scope !== undefined
        ? {
            scope: record.scope,
          }
        : {}),

      message:
        record.message,

      ...(record.data.length > 0
        ? {
            data: record.data,
          }
        : {}),

      ...(record.context !== undefined
        ? {
            context: record.context,
          }
        : {}),
    };
  }

  private isErrorLevel(
    record: FormattedLogRecord,
  ): boolean {
    return (
      record.level === "error" ||
      record.level === "fatal"
    );
  }

  private formatDate(
    timestamp: Date,
  ): string {
    const year =
      timestamp.getFullYear();

    const month =
      String(
        timestamp.getMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        timestamp.getDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
}