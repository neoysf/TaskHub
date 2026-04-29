import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { prisma } from "../config/db";

const r = Router();
r.get("/", authenticate, asyncHandler(async (req, res) => {
  res.json(await prisma.notification.findMany({
    where: { userId: req.user!.userId }, orderBy: { createdAt: "desc" }, take: 50,
  }));
}));
r.post("/:id/read", authenticate, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.userId }, data: { isRead: true } });
  res.json({ ok: true });
}));
r.post("/read-all", authenticate, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
}));
export default r;
