import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const r = Router();
r.post("/", authenticate, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");
  res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size, mimeType: req.file.mimetype });
}));
export default r;
