import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { messageSchema, startConversationSchema } from "../validators/schemas";
import { chatService } from "../services/chat.service";

const r = Router();
r.get("/conversations", authenticate, asyncHandler(async (req, res) => {
  res.json(await chatService.listConversations(req.user!.userId));
}));
r.post("/conversations", authenticate, validateBody(startConversationSchema), asyncHandler(async (req, res) => {
  const conv = await chatService.getOrCreateConversation(req.user!.userId, req.body.recipientId, req.body.jobId);
  if (req.body.initialMessage) await chatService.sendMessage(conv.id, req.user!.userId, req.body.initialMessage);
  res.status(201).json(conv);
}));
r.get("/conversations/:id/messages", authenticate, asyncHandler(async (req, res) => {
  const before = typeof req.query.before === "string" ? req.query.before : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await chatService.getMessages(req.params.id, req.user!.userId, { before, limit }));
}));
r.post("/conversations/:id/messages", authenticate, validateBody(messageSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await chatService.sendMessage(req.params.id, req.user!.userId, req.body.content, req.body.attachmentUrl));
}));
r.post("/conversations/:id/read", authenticate, asyncHandler(async (req, res) => {
  res.json(await chatService.markRead(req.params.id, req.user!.userId));
}));
export default r;
