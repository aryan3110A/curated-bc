import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/app-error";

const getAccessTokenFromRequest = (req: Request) => {
  const authorization = req.header("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return req.cookies?.cc_access_token as string | undefined;
};

const attachUser = (req: Request, token: string) => {
  const payload = verifyAccessToken(token);

  if (payload.tokenType !== "access") {
    throw new AppError("Invalid access token.", StatusCodes.UNAUTHORIZED);
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };
};

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      throw new AppError("Authentication required.", StatusCodes.UNAUTHORIZED);
    }

    attachUser(req, token);
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (token) {
      attachUser(req, token);
    }
  } catch {
    req.user = undefined;
  }

  next();
};
