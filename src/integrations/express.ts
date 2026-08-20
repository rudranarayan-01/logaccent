import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type { Logger } from "../logger/logger";

export function expressErrorHandler(
  logger: Logger,
) {
  return (
    error: unknown,
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void => {
    logger.error("Express request error", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      error,
    });

    next(error);
  };
}