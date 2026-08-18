import { afterEach, describe, expect, it } from "vitest";

import { readFile, rm } from "node:fs/promises";

import path from "node:path";

import { FileTransport } from "../src/transports/file";
import type { FormattedLogRecord } from "../src/transports/types";

const testDirectory = path.join(process.cwd(), ".test-logs");

function createRecord(
  overrides: Partial<FormattedLogRecord> = {},
): FormattedLogRecord {
  return {
    level: "info",

    timestamp: new Date("2026-08-18T10:00:00.000Z"),

    message: "Server started",

    data: [],

    formattedMessage: "[INFO] Server started",

    ...overrides,
  };
}

afterEach(async () => {
  await rm(testDirectory, {
    recursive: true,
    force: true,
  });
});

describe("FileTransport", () => {
  it("creates the log directory automatically", async () => {
    const transport = new FileTransport({
      directory: testDirectory,
    });

    await transport.write(createRecord());

    const filePath = path.join(testDirectory, "app-2026-08-18.log");

    const content = await readFile(filePath, "utf8");

    expect(content).toContain("[INFO] Server started");
  });

  it("creates daily log files", async () => {
    const transport = new FileTransport({
      directory: testDirectory,
    });

    await transport.write(createRecord());

    await transport.write(
      createRecord({
        timestamp: new Date("2026-08-19T10:00:00.000Z"),

        message: "Next day",

        formattedMessage: "[INFO] Next day",
      }),
    );

    const first = await readFile(
      path.join(testDirectory, "app-2026-08-18.log"),
      "utf8",
    );

    const second = await readFile(
      path.join(testDirectory, "app-2026-08-19.log"),
      "utf8",
    );

    expect(first).toContain("Server started");

    expect(second).toContain("Next day");
  });

  it("supports JSON output", async () => {
    const transport = new FileTransport({
      directory: testDirectory,

      format: "json",
    });

    await transport.write(
      createRecord({
        scope: "API",
      }),
    );

    const content = await readFile(
      path.join(testDirectory, "app-2026-08-18.log"),
      "utf8",
    );

    const parsed = JSON.parse(content.trim());

    expect(parsed.level).toBe("info");

    expect(parsed.message).toBe("Server started");

    expect(parsed.scope).toBe("API");
  });

  it("supports a separate error file", async () => {
    const transport = new FileTransport({
      directory: testDirectory,

      separateErrorFile: true,
    });

    await transport.write(
      createRecord({
        level: "error",

        message: "Database failed",

        formattedMessage: "[ERROR] Database failed",
      }),
    );

    const content = await readFile(
      path.join(testDirectory, "app-2026-08-18.error.log"),
      "utf8",
    );

    expect(content).toContain("Database failed");
  });
});
