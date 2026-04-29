import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import jobRoutes from "./routes/jobs.routes";
import applicationRoutes from "./routes/applications.routes";
import paymentRoutes from "./routes/payments.routes";
import chatRoutes from "./routes/chat.routes";
import verificationRoutes from "./routes/verification.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notifications.routes";
import uploadsRoutes from "./routes/uploads.routes";

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true });

  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));
  app.get("/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/users", apiLimiter, userRoutes);
  app.use("/api/jobs", apiLimiter, jobRoutes);
  app.use("/api/applications", apiLimiter, applicationRoutes);
  app.use("/api/payments", apiLimiter, paymentRoutes);
  app.use("/api/chat", apiLimiter, chatRoutes);
  app.use("/api/verification", apiLimiter, verificationRoutes);
  app.use("/api/admin", apiLimiter, adminRoutes);
  app.use("/api/notifications", apiLimiter, notificationRoutes);
  app.use("/api/uploads", apiLimiter, uploadsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
