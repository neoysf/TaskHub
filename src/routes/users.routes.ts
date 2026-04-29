import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validators/schemas";
import { userService } from "../services/user.service";
import { reviewService } from "../services/review.service";

const r = Router();
r.get("/me/dashboard", authenticate, asyncHandler(async (req, res) => {
  res.json(await userService.dashboardStats(req.user!.userId));
}));
r.patch("/me", authenticate, validateBody(updateProfileSchema), asyncHandler(async (req, res) => {
  res.json(await userService.update(req.user!.userId, req.body));
}));
r.get("/:usernameOrId", asyncHandler(async (req, res) => {
  res.json(await userService.getPublicProfile(req.params.usernameOrId));
}));
r.get("/:usernameOrId/reviews", asyncHandler(async (req, res) => {
  const profile = await userService.getPublicProfile(req.params.usernameOrId);
  res.json(await reviewService.listForUser(profile.id));
}));
export default r;
