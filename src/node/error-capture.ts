import type { Logger } from "../logger/logger";

export interface ErrorCaptureOptions {
  readonly exitOnUncaughtException?: boolean;
  readonly captureUnhandledRejections?: boolean;
  readonly captureWarnings?: boolean;
}

const defaultOptions: Required<ErrorCaptureOptions> = {
  exitOnUncaughtException: true,
  captureUnhandledRejections: true,
  captureWarnings: true,
};

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause !== undefined
        ? { cause: error.cause }
        : {}),
    };
  }

  return {
    value: error,
  };
}

export function captureErrors(
  logger: Logger,
  options: ErrorCaptureOptions = {},
): () => void {
  const resolved = {
    ...defaultOptions,
    ...options,
  };

  const uncaughtExceptionHandler = (error: unknown): void => {
    logger.fatal(
      "Uncaught exception",
      serializeError(error),
    );

    if (resolved.exitOnUncaughtException) {
      // Give transports a chance to finish writing.
      void logger.flush().finally(() => {
        process.exit(1);
      });
    }
  };

  const unhandledRejectionHandler = (
    reason: unknown,
    promise: Promise<unknown>,
  ): void => {
    logger.error(
      "Unhandled promise rejection",
      {
        reason: serializeError(reason),
        promise: String(promise),
      },
    );
  };

  const warningHandler = (warning: Error): void => {
    logger.warn(
      "Node.js process warning",
      serializeError(warning),
    );
  };

  process.on(
    "uncaughtException",
    uncaughtExceptionHandler,
  );

  if (resolved.captureUnhandledRejections) {
    process.on(
      "unhandledRejection",
      unhandledRejectionHandler,
    );
  }

  if (resolved.captureWarnings) {
    process.on("warning", warningHandler);
  }

  return () => {
    process.off(
      "uncaughtException",
      uncaughtExceptionHandler,
    );

    if (resolved.captureUnhandledRejections) {
      process.off(
        "unhandledRejection",
        unhandledRejectionHandler,
      );
    }

    if (resolved.captureWarnings) {
      process.off("warning", warningHandler);
    }
  };
}