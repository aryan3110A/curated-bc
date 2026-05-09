import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";

import { db } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { durationToMs } from "../../utils/duration";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { comparePassword } from "../../utils/password";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

type SafeUser = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

const buildPayload = (user: SafeUser) => ({
  sub: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

const issueTokenPair = async (user: SafeUser) => {
  const tokenId = randomUUID();
  const accessToken = signAccessToken(buildPayload(user));
  const refreshToken = signRefreshToken(buildPayload(user), tokenId);

  await db.refreshToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      expiresAt: new Date(Date.now() + durationToMs(env.REFRESH_TOKEN_TTL))
    }
  });

  return {
    accessToken,
    refreshToken
  };
};

export const authService = {
  async login(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        ...safeUserSelect,
        password: true
      }
    });

    if (!user) {
      throw new AppError("Invalid email or password.", StatusCodes.UNAUTHORIZED);
    }

    const validPassword = await comparePassword(password, user.password);

    if (!validPassword) {
      throw new AppError("Invalid email or password.", StatusCodes.UNAUTHORIZED);
    }

    const { password: _password, ...safeUser } = user;
    const tokens = await issueTokenPair(safeUser);

    return {
      user: safeUser,
      ...tokens
    };
  },

  async refresh(currentRefreshToken: string) {
    const payload = verifyRefreshToken(currentRefreshToken);

    if (payload.tokenType !== "refresh" || !payload.jti) {
      throw new AppError("Invalid refresh token.", StatusCodes.UNAUTHORIZED);
    }

    const savedToken = await db.refreshToken.findUnique({
      where: { id: payload.jti },
      include: {
        user: {
          select: safeUserSelect
        }
      }
    });

    if (
      !savedToken ||
      savedToken.userId !== payload.sub ||
      savedToken.revokedAt ||
      savedToken.expiresAt < new Date()
    ) {
      throw new AppError("Refresh token expired or revoked.", StatusCodes.UNAUTHORIZED);
    }

    await db.refreshToken.update({
      where: { id: savedToken.id },
      data: {
        revokedAt: new Date()
      }
    });

    const tokens = await issueTokenPair(savedToken.user);

    return {
      user: savedToken.user,
      ...tokens
    };
  },

  async logout(currentRefreshToken?: string) {
    if (!currentRefreshToken) {
      return;
    }

    try {
      const payload = verifyRefreshToken(currentRefreshToken);

      if (!payload.jti) {
        return;
      }

      await db.refreshToken.updateMany({
        where: {
          id: payload.jti,
          userId: payload.sub,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    } catch {
      return;
    }
  },

  async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: safeUserSelect
    });

    if (!user) {
      throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    return user;
  }
};
