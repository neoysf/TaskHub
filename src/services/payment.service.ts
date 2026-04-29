import Stripe from "stripe";
import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import { notificationService } from "./notification.service";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export const paymentService = {
  async fundEscrow(paymentId: string, employerId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { job: true } });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.employerId !== employerId) throw ApiError.forbidden();
    if (payment.status !== "PENDING") throw ApiError.badRequest("Already funded or processed");

    if (!stripe) {
      const updated = await prisma.payment.update({
        where: { id: paymentId }, data: { status: "HELD_IN_ESCROW", fundedAt: new Date() },
      });
      return { payment: updated, clientSecret: null, devMode: true };
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(payment.amount) * 100),
      currency: payment.currency.toLowerCase(),
      capture_method: "manual",
      metadata: { paymentId, jobId: payment.jobId, employerId },
    });

    const updated = await prisma.payment.update({
      where: { id: paymentId }, data: { stripePaymentIntentId: intent.id },
    });
    return { payment: updated, clientSecret: intent.client_secret, devMode: false };
  },

  async release(paymentId: string, byUserId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { job: true, worker: true } });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.employerId !== byUserId) throw ApiError.forbidden("Only employer can release");
    if (payment.status !== "HELD_IN_ESCROW") throw ApiError.badRequest("Not in escrow");
    if (payment.job.status !== "COMPLETED") throw ApiError.badRequest("Job must be completed first");

    if (stripe && payment.stripePaymentIntentId) {
      await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
      if (payment.worker.stripeAccountId) {
        const transfer = await stripe.transfers.create({
          amount: Math.round(Number(payment.workerAmount) * 100),
          currency: payment.currency.toLowerCase(),
          destination: payment.worker.stripeAccountId,
          metadata: { paymentId, jobId: payment.jobId },
        });
        await prisma.payment.update({ where: { id: paymentId }, data: { stripeTransferId: transfer.id } });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId }, data: { status: "RELEASED", releasedAt: new Date() },
      });
      await tx.user.update({
        where: { id: payment.workerId },
        data: { totalEarned: { increment: payment.workerAmount }, jobsCompleted: { increment: 1 } },
      });
      return p;
    });

    await notificationService.create({
      userId: payment.workerId, type: "PAYMENT_RECEIVED",
      title: "Ödəniş alındı", body: `${payment.workerAmount} ${payment.currency} hesabınıza köçürüldü`,
      data: { paymentId, jobId: payment.jobId },
    });
    return updated;
  },

  async refund(paymentId: string, byUserId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.employerId !== byUserId) throw ApiError.forbidden();
    if (payment.status !== "HELD_IN_ESCROW" && payment.status !== "PENDING") throw ApiError.badRequest("Cannot refund");
    if (stripe && payment.stripePaymentIntentId) await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
    return prisma.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", refundedAt: new Date() } });
  },

  async getMine(userId: string) {
    return prisma.payment.findMany({
      where: { OR: [{ employerId: userId }, { workerId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { job: { select: { id: true, title: true } } },
    });
  },
};
