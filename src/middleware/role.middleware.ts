import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../utils/app-error";

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", StatusCodes.UNAUTHORIZED));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Insufficient permissions.", StatusCodes.FORBIDDEN));
    }

    next();
  };
};
