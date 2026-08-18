import type { FormattedLogRecord, LogTransport } from "./types";

export class TransportManager {
  constructor(private readonly transports: readonly LogTransport[]) {}

  async write(record: FormattedLogRecord): Promise<void> {
    await Promise.allSettled(
      this.transports.map(async (transport) => {
        try {
          await transport.write(record);
        } catch (error) {
          console.error(
            `[logAccent] Transport "${transport.name}" failed.`,
            error,
          );
        }
      }),
    );
  }

  async flush(): Promise<void> {
    await Promise.allSettled(
      this.transports.map(async (transport) => {
        await transport.flush?.();
      }),
    );
  }

  async close(): Promise<void> {
    await Promise.allSettled(
      this.transports.map(async (transport) => {
        await transport.close?.();
      }),
    );
  }
}
