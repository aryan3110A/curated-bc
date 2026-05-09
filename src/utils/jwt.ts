import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";

import { env } from "../config/env";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  tokenType: "access" | "refresh";
};

const parseToken = (value: string, secret: string) => {
  const decoded = jwt.verify(value, secret);

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload.");
  }

  return decoded as JwtPayload & AuthTokenPayload;
};

export const signAccessToken = (payload: Omit<AuthTokenPayload, "tokenType">) => {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]
  };

  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (payload: Omit<AuthTokenPayload, "tokenType">, tokenId: string) => {
  const options: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"],
    jwtid: tokenId
  };

  return jwt.sign({ ...payload, tokenType: "refresh" }, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (value: string) => parseToken(value, env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (value: string) => parseToken(value, env.JWT_REFRESH_SECRET);
