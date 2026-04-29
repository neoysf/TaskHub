import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { paymentService } from "../services/payment.service";

const r = Router();
r.get("/me", authenticate, asyncHandler(async (req, res) => {
  res.json(await paymentService.getMine(req.user!.userId));
}));
r.post("/:id/fund", authenticate, asyncHandler(async (req, res) => {
  res.json(await paymentService.fundEscrow(req.params.id, req.user!.userId));
}));
r.post("/:id/release", authenticate, asyncHandler(async (req, res) => {
  res.json(await paymentService.release(req.params.id, req.user!.userId));
}));
r.post("/:id/refund", authenticate, asyncHandler(async (req, res) => {
  res.json(await paymentService.refund(req.params.id, req.user!.userId));
}));
export default r;
