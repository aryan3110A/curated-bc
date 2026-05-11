import pino from "pino";

import { env, isProduction } from "./env";

const transport = isProduction
  ? undefined
  : pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
        messageFormat: "{msg}",
        singleLine: false,
      },
    });

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: {
      service: "curatedcounter-api",
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "password",
        "refreshToken",
      ],
      censor: "[redacted]",
    },
  },
  transport,
);
