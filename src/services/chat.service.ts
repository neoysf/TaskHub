import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { getIO } from "../sockets/io";
import { notificationService } from "./notification.service";

export const chatService = {
  async getOrCreateConversation(userAId: string, userBId: string, jobId?: string) {
    if (userAId === userBId) throw ApiError.badRequest("Cannot chat with yourself");
    const [user1Id, user2Id] = [userAId, userBId].sort();
    const existing = await prisma.conversation.findFirst({ where: { user1Id, user2Id, jobId: jobId ?? null } });
    if (existing) return existing;
    return prisma.conversation.create({ data: { user1Id, user2Id, jobId: jobId ?? null } });
  },

  async listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        user1: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
  },

  async getMessages(conversationId: string, userId: string, opts: { limit?: number; before?: string } = {}) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw ApiError.notFound("Conversation not found");
    if (conv.user1Id !== userId && conv.user2Id !== userId) throw ApiError.forbidden();
    return prisma.message.findMany({
      where: {
        conversationId,
        ...(opts.before && { createdAt: { lt: new Date(opts.before) } }),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.limit ?? 50, 100),
    });
  },

  async sendMessage(conversationId: string, senderId: string, content: string, attachmentUrl?: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw ApiError.notFound("Conversation not found");
    if (conv.user1Id !== senderId && conv.user2Id !== senderId) throw ApiError.forbidden();
    const recipientId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;

    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId, senderId, content, attachmentUrl } }),
      prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);

    try {
      getIO().to(`conversation:${conversationId}`).emit("message:new", message);
      getIO().to(`user:${recipientId}`).emit("conversation:update", { conversationId, lastMessageAt: new Date() });
    } catch {}

    notificationService.create({
      userId: recipientId, type: "NEW_MESSAGE",
      title: "Yeni mesaj", body: content.slice(0, 80),
      data: { conversationId, messageId: message.id },
    }).catch(() => {});

    return message;
  },

  async markRead(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw ApiError.notFound();
    if (conv.user1Id !== userId && conv.user2Id !== userId) throw ApiError.forbidden();
    return prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },
};
