import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, requireRole } from "../middleware/auth";
import { disputeService } from "../services/dispute.service";
import { prisma } from "../config/db";

const r = Router();
r.use(authenticate, requireRole("ADMIN", "MODERATOR"));

r.get("/disputes", asyncHandler(async (req, res) => {
  res.json(await disputeService.listAll(req.query.status as string | undefined));
}));

r.get("/stats", asyncHandler(async (_req, res) => {
  const [users, jobs, completedJobs, disputes, totalCommission] = await prisma.$transaction([
    prisma.user.count(),
    prisma.job.count(),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.payment.aggregate({ where: { status: "RELEASED" }, _sum: { commissionAmount: true } }),
  ]);
  res.json({
    users, jobs, completedJobs, openDisputes: disputes,
    totalCommissionEarned: totalCommission._sum.commissionAmount ?? 0,
  });
}));
export default r;
