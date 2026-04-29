import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { registerSchema, loginSchema, refreshSchema } from "../validators/schemas";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";

const r = Router();
r.post("/register", validateBody(registerSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body));
}));
r.post("/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body));
}));
r.post("/refresh", validateBody(refreshSchema), asyncHandler(async (req, res) => {
  res.json(await authService.refresh(req.body.refreshToken));
}));
r.post("/logout", validateBody(refreshSchema), asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.json({ ok: true });
}));
r.get("/me", authenticate, asyncHandler(async (req, res) => {
  res.json(await userService.getMe(req.user!.userId));
}));
export default r;
