import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { respondApplicationSchema } from "../validators/schemas";
import { applicationService } from "../services/application.service";

const r = Router();
r.get("/me", authenticate, asyncHandler(async (req, res) => {
  res.json(await applicationService.listMine(req.user!.userId));
}));
r.post("/:id/withdraw", authenticate, asyncHandler(async (req, res) => {
  res.json(await applicationService.withdraw(req.params.id, req.user!.userId));
}));
r.post("/:id/respond", authenticate, validateBody(respondApplicationSchema), asyncHandler(async (req, res) => {
  res.json(await applicationService.respond(req.params.id, req.user!.userId, req.body.action));
}));
export default r;
