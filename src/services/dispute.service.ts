import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { z } from "zod";
import { disputeSchema } from "../validators/schemas";
import { notificationService } from "./notification.service";

type DisputeInput = z.infer<typeof disputeSchema>;

export const disputeService = {
  async open(jobId: string, raisedById: string, input: DisputeInput) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, include: { dispute: true } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.employerId !== raisedById && job.workerId !== raisedById) throw ApiError.forbidden();
    if (job.dispute) throw ApiError.conflict("Dispute already open for this job");
    if (!["IN_PROGRESS", "COMPLETED"].includes(job.status)) throw ApiError.badRequest("Can only dispute jobs in progress or completed");

    const dispute = await prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: { jobId, raisedById, reason: input.reason, evidence: (input.evidence ?? []) as object },
      });
      await tx.job.update({ where: { id: jobId }, data: { status: "DISPUTED" } });
      return d;
    });

    const otherPartyId = job.employerId === raisedById ? job.workerId! : job.employerId;
    await notificationService.create({
      userId: otherPartyId, type: "DISPUTE_OPENED",
      title: "Mübahisə açıldı", body: `"${job.title}" işi üzrə mübahisə açıldı`,
      data: { jobId, disputeId: dispute.id },
    });
    return dispute;
  },

  async listAll(status?: string) {
    return prisma.dispute.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      include: { job: { select: { id: true, title: true, employerId: true, workerId: true } } },
    });
  },
};
