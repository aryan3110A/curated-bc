import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { apiRouter } from "./routes";

export const app = express();

const compactReqSerializer = (req: {
  id?: string | number;
  method?: string;
  url?: string;
  query?: unknown;
  params?: unknown;
  remoteAddress?: string;
  remotePort?: number;
}) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  query: req.query,
  params: req.params,
  remoteAddress: req.remoteAddress,
  remotePort: req.remotePort,
});

const compactResSerializer = (res: { statusCode?: number }) => ({
  statusCode: res.statusCode,
});

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === env.CLIENT_URL) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS policy blocked this origin."));
    },
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }) as unknown as RequestHandler,
);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: compactReqSerializer,
      res: compactResSerializer,
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req, res, error) =>
      `${req.method} ${req.url} -> ${res.statusCode} (${error.message})`,
  }),
);
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser() as unknown as RequestHandler);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CuratedCounter API is healthy.",
  });
});

app.use("/api", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
