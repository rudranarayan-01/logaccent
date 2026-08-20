import type {
  Application,
  NextFunction,
  Request,
  Response,
} from "express";

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

      if (config.logResponses) {
        logger.success(`${req.method} ${req.originalUrl}`, {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      }
    });

    next();
  });

  // Global Express Error Middleware
  app.use(
    (
      error: unknown,
      req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      logger.error("Express request failed", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: req.body,
        query: req.query,
        params: req.params,
        error,
      });

      next(error);
    },
  );
}