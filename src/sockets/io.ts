import { Server as IOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { chatService } from "../services/chat.service";

let io: IOServer | null = null;

export function initIO(httpServer: HttpServer) {
  io = new IOServer(httpServer, { cors: { origin: env.CLIENT_URL, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on("conversation:join", (conversationId: string) => { socket.join(`conversation:${conversationId}`); });
    socket.on("conversation:leave", (conversationId: string) => { socket.leave(`conversation:${conversationId}`); });

    socket.on("message:send", async (
      data: { conversationId: string; content: string; attachmentUrl?: string },
      ack?: (resp: unknown) => void,
    ) => {
      try {
        const msg = await chatService.sendMessage(data.conversationId, userId, data.content, data.attachmentUrl);
        ack?.({ ok: true, message: msg });
      } catch (e) { ack?.({ ok: false, error: (e as Error).message }); }
    });

    socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit("typing", { userId, ...data });
    });

    socket.on("message:read", async (conversationId: string) => {
      await chatService.markRead(conversationId, userId).catch(() => {});
      socket.to(`conversation:${conversationId}`).emit("message:read", { conversationId, userId });
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
