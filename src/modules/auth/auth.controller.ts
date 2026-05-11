import type { Response } from "express";

import { env, isProduction } from "../../config/env";
import { asyncHandler } from "../../utils/async-handler";
import { durationToMs } from "../../utils/duration";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./auth.constants";
import { authService } from "./auth.service";

const cookieDomain = env.COOKIE_DOMAIN?.trim() || undefined;

const sharedCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  ...(cookieDomain ? { domain: cookieDomain } : {}),
  path: "/",
};

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...sharedCookieOptions,
    maxAge: durationToMs(env.ACCESS_TOKEN_TTL),
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...sharedCookieOptions,
    maxAge: durationToMs(env.REFRESH_TOKEN_TTL),
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME, sharedCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, sharedCookieOptions);
};

export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login(email, password);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
    },
  });
});

export const refreshController = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const result = await authService.refresh(refreshToken ?? "");

  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
    },
  });
});

export const logoutController = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logout(refreshToken);
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

export const meController = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user!.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});
