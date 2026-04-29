import { prisma } from "../config/db";
import { NotificationType } from "@prisma/client";
import { getIO } from "../sockets/io";

export const notificationService = {
  async create(params: {
    userId: string; type: NotificationType; title: string; body: string;
    data?: Record<string, unknown>;
  }) {
    const notif = await prisma.notification.create({
      data: { userId: params.userId, type: params.type, title: params.title, body: params.body, data: (params.data ?? {}) as object },
    });
    try { getIO().to(`user:${params.userId}`).emit("notification:new", notif); } catch {}
    return notif;
  },
};
