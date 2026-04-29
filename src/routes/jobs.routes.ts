import { Router, Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  createJobSchema, updateJobSchema, jobListQuerySchema,
  applicationSchema, checkInOutSchema, reviewSchema, disputeSchema,
} from "../validators/schemas";
import { jobService } from "../services/job.service";
import { applicationService } from "../services/application.service";
import { reviewService } from "../services/review.service";
import { disputeService } from "../services/dispute.service";

const r = Router();

r.get("/", validateQuery(jobListQuerySchema), asyncHandler(async (req, res) => {
  const q = (req as Request & { validatedQuery: never }).validatedQuery;
  res.json(await jobService.list(q));
}));
r.post("/", authenticate, validateBody(createJobSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await jobService.create(req.user!.userId, req.body));
}));
r.get("/:id", optionalAuth, asyncHandler(async (req, res) => {
  res.json(await jobService.getById(req.params.id, req.user?.userId));
}));
r.patch("/:id", authenticate, validateBody(updateJobSchema), asyncHandler(async (req, res) => {
  res.json(await jobService.update(req.params.id, req.user!.userId, req.body));
}));
r.post("/:id/cancel", authenticate, asyncHandler(async (req, res) => {
  res.json(await jobService.cancel(req.params.id, req.user!.userId));
}));
r.post("/:id/check", authenticate, validateBody(checkInOutSchema), asyncHandler(async (req, res) => {
  res.json(await jobService.checkInOut(req.params.id, req.user!.userId, req.body.action));
}));
r.get("/:id/applications", authenticate, asyncHandler(async (req, res) => {
  res.json(await applicationService.listForJob(req.params.id, req.user!.userId));
}));
r.post("/:id/applications", authenticate, validateBody(applicationSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await applicationService.apply(req.params.id, req.user!.userId, req.body));
}));
r.post("/:id/reviews", authenticate, validateBody(reviewSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await reviewService.create(req.params.id, req.user!.userId, req.body));
}));
r.post("/:id/dispute", authenticate, validateBody(disputeSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await disputeService.open(req.params.id, req.user!.userId, req.body));
}));
export default r;
