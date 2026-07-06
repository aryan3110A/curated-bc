import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { AppError } from "../utils/app-error";

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    const flattened = error.flatten();
    const fieldErrors = Object.fromEntries(
      error.issues.map((issue) => {
        const fieldPath = issue.path
          .filter((segment) => segment !== "body")
          .join(".");
        const label = fieldPath || "request";

        return [label, [issue.message]];
      }),
    );

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Validation failed.",
      errors: {
        formErrors: flattened.formErrors,
        fieldErrors,
      },
    });
  }

  if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Your session is invalid or expired."
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details
    });
  }

  logger.error(
    {
      error,
      method: req.method,
      path: req.originalUrl
    },
    "Unhandled request error"
  );

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Something went wrong."
  });
};
