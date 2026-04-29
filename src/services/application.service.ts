import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { z } from "zod";
import { applicationSchema } from "../validators/schemas";
import { notificationService } from "./notification.service";
import { calculateAmounts, getCommissionRate } from "../utils/commission";

type AppInput = z.infer<typeof applicationSchema>;

export const applicationService = {
  async apply(jobId: string, workerId: string, input: AppInput) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.status !== "OPEN" && job.status !== "IN_REVIEW") throw ApiError.badRequest("Job not accepting applications");
    if (job.employerId === workerId) throw ApiError.badRequest("Cannot apply to your own job");

    const existing = await prisma.application.findUnique({ where: { jobId_workerId: { jobId, workerId } } });
    if (existing) throw ApiError.conflict("You already applied to this job");

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({ data: { jobId, workerId, ...input } });
      await tx.job.update({
        where: { id: jobId },
        data: { applicationsCount: { increment: 1 }, status: job.status === "OPEN" ? "IN_REVIEW" : job.status },
      });
      return created;
    });

    await notificationService.create({
      userId: job.employerId, type: "JOB_APPLICATION",
      title: "Yeni müraciət", body: `İşinizə yeni müraciət gəldi: ${job.title}`,
      data: { jobId, applicationId: application.id },
    });
    return application;
  },

  async listForJob(jobId: string, employerId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw ApiError.notFound("Job not found");
    if (job.employerId !== employerId) throw ApiError.forbidden("Not your job");
    return prisma.application.findMany({
      where: { jobId }, orderBy: { createdAt: "desc" },
      include: {
        worker: { select: { id: true, username: true, fullName: true, avatarUrl: true, ratingAvg: true, ratingCount: true, jobsCompleted: true, badges: true } },
      },
    });
  },

  async listMine(workerId: string) {
    return prisma.application.findMany({
      where: { workerId }, orderBy: { createdAt: "desc" },
      include: { job: { select: { id: true, title: true, status: true, category: true, city: true } } },
    });
  },

  async withdraw(applicationId: string, workerId: string) {
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw ApiError.notFound("Application not found");
    if (app.workerId !== workerId) throw ApiError.forbidden();
    if (app.status !== "PENDING") throw ApiError.badRequest("Cannot withdraw");
    return prisma.application.update({ where: { id: applicationId }, data: { status: "WITHDRAWN", respondedAt: new Date() } });
  },

  async respond(applicationId: string, employerId: string, action: "accept" | "reject") {
    const app = await prisma.application.findUnique({ where: { id: applicationId }, include: { job: true } });
    if (!app) throw ApiError.notFound("Application not found");
    if (app.job.employerId !== employerId) throw ApiError.forbidden();
    if (app.status !== "PENDING") throw ApiError.badRequest("Already responded");

    if (action === "reject") {
      const updated = await prisma.application.update({
        where: { id: applicationId }, data: { status: "REJECTED", respondedAt: new Date() },
      });
      await notificationService.create({
        userId: app.workerId, type: "APPLICATION_REJECTED",
        title: "Müraciət rədd edildi", body: `"${app.job.title}" üçün müraciətiniz rədd edildi`,
        data: { jobId: app.jobId },
      });
      return updated;
    }

    const rate = getCommissionRate(app.job.category, app.job.urgency);
    const price = Number(app.proposedPrice);
    const { commission, workerAmount } = calculateAmounts(price, rate);

    const result = await prisma.$transaction(async (tx) => {
      const acceptedApp = await tx.application.update({
        where: { id: applicationId }, data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await tx.application.updateMany({
        where: { jobId: app.jobId, id: { not: applicationId }, status: "PENDING" },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      await tx.job.update({
        where: { id: app.jobId },
        data: { status: "ASSIGNED", workerId: app.workerId, finalPrice: price, commissionRate: rate },
      });
      await tx.payment.create({
        data: {
          jobId: app.jobId, employerId: app.job.employerId, workerId: app.workerId,
          amount: price, commissionAmount: commission, workerAmount,
        },
      });
      return acceptedApp;
    });

    await notificationService.create({
      userId: app.workerId, type: "APPLICATION_ACCEPTED",
      title: "Təbriklər! Qəbul edildiniz", body: `"${app.job.title}" işinə qəbul edildiniz`,
      data: { jobId: app.jobId },
    });
    return result;
  },
};
