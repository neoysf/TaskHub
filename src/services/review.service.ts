import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { z } from "zod";
import { reviewSchema } from "../validators/schemas";
import { notificationService } from "./notification.service";
import { badgeService } from "./badge.service";

type ReviewInput = z.infer<typeof reviewSchema>;

export const reviewService = {
  async create(jobId: string, authorId: string, input: ReviewInput) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.status !== "COMPLETED") throw ApiError.badRequest("Can only review completed jobs");
    if (authorId !== job.employerId && authorId !== job.workerId) throw ApiError.forbidden();
    const subjectId = authorId === job.employerId ? job.workerId! : job.employerId;

    const existing = await prisma.review.findUnique({ where: { jobId_authorId: { jobId, authorId } } });
    if (existing) throw ApiError.conflict("Already reviewed");

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: { jobId, authorId, subjectId, rating: input.rating, comment: input.comment },
      });
      const agg = await tx.review.aggregate({ where: { subjectId }, _avg: { rating: true }, _count: true });
      await tx.user.update({
        where: { id: subjectId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
      });
      return r;
    });

    await badgeService.recalculate(subjectId);
    await notificationService.create({
      userId: subjectId, type: "NEW_REVIEW",
      title: "Yeni rəy", body: `Sizə ${input.rating} ulduzlu rəy verildi`,
      data: { reviewId: review.id, jobId },
    });
    return review;
  },

  async listForUser(subjectId: string) {
    return prisma.review.findMany({
      where: { subjectId, isPublic: true }, orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true, category: true } },
      },
    });
  },
};
