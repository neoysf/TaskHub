import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { verificationService } from "../services/verification.service";
import { ApiError } from "../utils/ApiError";

const r = Router();

r.post(
  "/submit",
  authenticate,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]>;
    if (!files?.front?.[0] || !files?.selfie?.[0]) throw ApiError.badRequest("front and selfie images are required");
    const { documentType, documentNumber } = req.body as { documentType?: string; documentNumber?: string };
    if (!documentType || !documentNumber) throw ApiError.badRequest("documentType and documentNumber required");

    const result = await verificationService.submit(req.user!.userId, {
      documentType, documentNumber,
      frontImageUrl: `/uploads/${files.front[0].filename}`,
      backImageUrl: files.back?.[0] ? `/uploads/${files.back[0].filename}` : undefined,
      selfieUrl: `/uploads/${files.selfie[0].filename}`,
    });
    res.status(201).json(result);
  }),
);

r.get("/pending", authenticate, requireRole("ADMIN", "MODERATOR"), asyncHandler(async (_req, res) => {
  res.json(await verificationService.listPending());
}));
r.post("/:id/approve", authenticate, requireRole("ADMIN", "MODERATOR"), asyncHandler(async (req, res) => {
  await verificationService.review(req.params.id, req.user!.userId, "approve");
  res.json({ ok: true });
}));
r.post("/:id/reject", authenticate, requireRole("ADMIN", "MODERATOR"), asyncHandler(async (req, res) => {
  await verificationService.review(req.params.id, req.user!.userId, "reject", req.body?.reason);
  res.json({ ok: true });
}));
export default r;
