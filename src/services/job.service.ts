import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createJobSchema, updateJobSchema, jobListQuerySchema } from "../validators/schemas";
import { getCommissionRate } from "../utils/commission";

type CreateJobInput = z.infer<typeof createJobSchema>;
type UpdateJobInput = z.infer<typeof updateJobSchema>;
type JobListQuery = z.infer<typeof jobListQuerySchema>;

export const jobService = {
  async create(employerId: string, input: CreateJobInput) {
    const commissionRate = getCommissionRate(input.category, input.urgency);
    return prisma.job.create({ data: { ...input, employerId, commissionRate, publishedAt: new Date() } });
  },

  async list(query: JobListQuery) {
    const { page, limit, sortBy, search, ...filters } = query;
    const where: Prisma.JobWhereInput = {
      status: filters.status ?? "OPEN",
      ...(filters.category && { category: filters.category }),
      ...(filters.city && { city: { equals: filters.city, mode: "insensitive" } }),
      ...(filters.minBudget !== undefined && { budgetMax: { gte: filters.minBudget } }),
      ...(filters.maxBudget !== undefined && { budgetMin: { lte: filters.maxBudget } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
    const orderBy: Prisma.JobOrderByWithRelationInput =
      sortBy === "oldest" ? { publishedAt: "asc" }
      : sortBy === "price_high" ? { budgetMax: "desc" }
      : sortBy === "price_low" ? { budgetMin: "asc" }
      : { publishedAt: "desc" };

    const [items, total] = await prisma.$transaction([
      prisma.job.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: {
          employer: { select: { id: true, username: true, fullName: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string, viewerId?: string) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: { select: { id: true, username: true, fullName: true, avatarUrl: true, ratingAvg: true, ratingCount: true, jobsPosted: true, badges: true } },
        worker: { select: { id: true, username: true, fullName: true, avatarUrl: true, ratingAvg: true } },
        attachments: true,
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw ApiError.notFound("Job not found");
    if (viewerId && viewerId !== job.employerId) {
      await prisma.job.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});
    }
    return job;
  },

  async update(id: string, employerId: string, input: UpdateJobInput) {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.employerId !== employerId) throw ApiError.forbidden("Not your job");
    if (job.status !== "OPEN" && job.status !== "IN_REVIEW") throw ApiError.badRequest("Cannot edit job after assignment");
    return prisma.job.update({ where: { id }, data: input });
  },

  async cancel(id: string, userId: string) {
    const job = await prisma.job.findUnique({ where: { id }, include: { payment: true } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.employerId !== userId) throw ApiError.forbidden("Not your job");
    if (job.status === "COMPLETED" || job.status === "CANCELLED") throw ApiError.badRequest("Job cannot be cancelled");
    if (job.payment?.status === "HELD_IN_ESCROW") throw ApiError.badRequest("Refund escrow first via /payments/:id/refund");
    return prisma.job.update({ where: { id }, data: { status: "CANCELLED", closedAt: new Date() } });
  },

  async checkInOut(jobId: string, userId: string, action: "check_in" | "check_out") {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.employerId !== userId && job.workerId !== userId) throw ApiError.forbidden("Not part of this job");
    const isEmployer = userId === job.employerId;
    const data: Prisma.JobUpdateInput = {};

    if (action === "check_in") {
      if (job.status !== "ASSIGNED" && job.status !== "IN_PROGRESS") throw ApiError.badRequest("Job must be assigned to check in");
      if (isEmployer) data.employerConfirmedStart = true; else data.workerConfirmedStart = true;
      const bothStart = (isEmployer ? true : job.employerConfirmedStart) && (!isEmployer ? true : job.workerConfirmedStart);
      if (bothStart) { data.status = "IN_PROGRESS"; data.actualStartAt = new Date(); }
    } else {
      if (job.status !== "IN_PROGRESS") throw ApiError.badRequest("Job not in progress");
      if (isEmployer) data.employerConfirmedEnd = true; else data.workerConfirmedEnd = true;
      const bothEnd = (isEmployer ? true : job.employerConfirmedEnd) && (!isEmployer ? true : job.workerConfirmedEnd);
      if (bothEnd) { data.status = "COMPLETED"; data.actualEndAt = new Date(); data.closedAt = new Date(); }
    }
    return prisma.job.update({ where: { id: jobId }, data });
  },
};
