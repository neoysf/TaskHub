import { prisma } from "../config/db";
import { BadgeType } from "@prisma/client";

export const badgeService = {
  async recalculate(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { badges: true, verification: true } });
    if (!user) return;
    const desired: BadgeType[] = [];
    if (user.verification?.status === "VERIFIED") desired.push("VERIFIED");
    if (user.ratingAvg >= 4.8 && user.ratingCount >= 10) desired.push("TOP_RATED");
    if (user.responseTimeMinutes != null && user.responseTimeMinutes <= 30 && user.ratingCount >= 5) desired.push("FAST_RESPONDER");
    if (user.jobsCompleted >= 25 && user.ratingAvg >= 4.5) desired.push("RELIABLE");
    if (user.jobsCompleted >= 5 && user.jobsCompleted < 15 && user.ratingAvg >= 4.5) desired.push("RISING_STAR");
    if (user.jobsCompleted >= 50 && user.ratingAvg >= 4.7) desired.push("EXPERT");

    const current = new Set(user.badges.map((b) => b.type));
    const desiredSet = new Set(desired);
    const toAdd = desired.filter((d) => !current.has(d));
    const toRemove = user.badges.filter((b) => !desiredSet.has(b.type));

    if (toAdd.length) await prisma.userBadge.createMany({ data: toAdd.map((type) => ({ userId, type })), skipDuplicates: true });
    if (toRemove.length) await prisma.userBadge.deleteMany({ where: { id: { in: toRemove.map((b) => b.id) } } });
  },
};
