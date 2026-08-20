import type { Application, NextFunction, Request, Response } from "express";

import type { Logger } from "../logger/logger";

export interface ExpressLoggerOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logBody?: boolean;
  logHeaders?: boolean;
}

const defaults: Required<ExpressLoggerOptions> = {
  logRequests: true,
  logResponses: true,
  logBody: false,
  logHeaders: false,
};

export function setupExpressLogger(
  app: Application,
  logger: Logger,
  options: ExpressLoggerOptions = {},
): void {
  const config = {
    ...defaults,
    ...options,
  };

  // Request Logger Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    if (config.logRequests) {
      logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        query: req.query,
        params: req.params,
        ...(config.logBody ? { body: req.body } : {}),
        ...(config.logHeaders ? { headers: req.headers } : {}),
      });
    }

    res.on("finish", () => {
      const duration = Date.now() - startedAt;

      const payload = {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      if (res.statusCode >= 500) {
        logger.error(`${req.method} ${req.originalUrl}`, payload);
      } else if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.originalUrl}`, payload);
      } else {
        logger.success(`${req.method} ${req.originalUrl}`, payload);
      }
    });

    next();
  });

  // Global Express Error Middleware
  app.use(
    (error: unknown, req: Request, res: Response, next: NextFunction): void => {
      const err =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error;

      logger.error("Express request failed", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        statusCode: res.statusCode || 500,
        query: req.query,
        params: req.params,
        body: req.body,
        error: err,
      });

      next(error);
    },
  );
}
