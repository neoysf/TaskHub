import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { notificationService } from "./notification.service";
import { badgeService } from "./badge.service";

export const verificationService = {
  async submit(userId: string, params: {
    documentType: string; documentNumber: string;
    frontImageUrl: string; backImageUrl?: string; selfieUrl: string;
  }) {
    const existing = await prisma.verification.findUnique({ where: { userId } });
    if (existing && existing.status === "VERIFIED") throw ApiError.conflict("Already verified");

    const data = {
      documentType: params.documentType, documentNumber: params.documentNumber,
      frontImageUrl: params.frontImageUrl, backImageUrl: params.backImageUrl, selfieUrl: params.selfieUrl,
      status: "PENDING" as const, submittedAt: new Date(), rejectionReason: null,
    };

    const verification = existing
      ? await prisma.verification.update({ where: { userId }, data })
      : await prisma.verification.create({ data: { ...data, userId } });

    await prisma.user.update({ where: { id: userId }, data: { verificationStatus: "PENDING" } });
    return verification;
  },

  async review(verificationId: string, adminId: string, decision: "approve" | "reject", reason?: string) {
    const v = await prisma.verification.findUnique({ where: { id: verificationId } });
    if (!v) throw ApiError.notFound();

    const status = decision === "approve" ? "VERIFIED" : "REJECTED";
    await prisma.$transaction([
      prisma.verification.update({
        where: { id: verificationId },
        data: { status, reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: reason },
      }),
      prisma.user.update({
        where: { id: v.userId },
        data: { verificationStatus: status, trustScore: { increment: decision === "approve" ? 30 : 0 } },
      }),
    ]);

    if (decision === "approve") await badgeService.recalculate(v.userId);

    await notificationService.create({
      userId: v.userId,
      type: decision === "approve" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      title: decision === "approve" ? "Şəxsiyyət təsdiqləndi" : "Təsdiq rədd edildi",
      body: decision === "approve" ? "Profiliniz verified statusu aldı" : (reason ?? "Yenidən cəhd edin"),
    });
  },

  async listPending() {
    return prisma.verification.findMany({
      where: { status: "PENDING" }, orderBy: { submittedAt: "asc" },
      include: { user: { select: { id: true, username: true, fullName: true, email: true, dateOfBirth: true } } },
    });
  },
};
