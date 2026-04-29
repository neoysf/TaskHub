import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";

export const userService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { badges: true, verification: { select: { status: true } }, skills: { include: { skill: true } } },
    });
    if (!user) throw ApiError.notFound();
    const { passwordHash, ...safe } = user;
    return safe;
  },

  async getPublicProfile(usernameOrId: string) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: usernameOrId }, { id: usernameOrId }] },
      include: { badges: true, skills: { include: { skill: true } } },
    });
    if (!user) throw ApiError.notFound();
    const { passwordHash, totalEarned, email, phone, dateOfBirth, address, ...publicData } = user;
    return publicData;
  },

  async update(userId: string, data: Record<string, unknown>) {
    return prisma.user.update({ where: { id: userId }, data });
  },

  async dashboardStats(userId: string) {
    const [postedCount, workedCount, earnings, activeJobs] = await prisma.$transaction([
      prisma.job.count({ where: { employerId: userId } }),
      prisma.job.count({ where: { workerId: userId, status: "COMPLETED" } }),
      prisma.payment.aggregate({ where: { workerId: userId, status: "RELEASED" }, _sum: { workerAmount: true } }),
      prisma.job.count({
        where: { OR: [{ employerId: userId }, { workerId: userId }], status: { in: ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW"] } },
      }),
    ]);
    return {
      jobsPosted: postedCount,
      jobsCompleted: workedCount,
      totalEarned: earnings._sum.workerAmount ?? 0,
      activeJobs,
    };
  },
};
