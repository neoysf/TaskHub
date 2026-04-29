import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import { Prisma } from "@prisma/client";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) return res.status(err.statusCode).json({ error: err.message, details: err.details });
  if (err instanceof ZodError) return res.status(422).json({ error: "Validation failed", details: err.errors });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "Unique constraint violated", details: err.meta });
    if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
