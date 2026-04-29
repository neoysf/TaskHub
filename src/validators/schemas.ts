import { z } from "zod";

const passwordSchema = z.string().min(8).max(72)
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[a-z]/, "Must contain lowercase")
  .regex(/[0-9]/, "Must contain a number");

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  fullName: z.string().min(2).max(100),
  password: passwordSchema,
  phone: z.string().min(7).max(20).optional(),
  dateOfBirth: z.coerce.date(),
  city: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  avatarUrl: z.string().url().optional(),
});

export const jobCategoryEnum = z.enum(["HOME_SERVICES", "DELIVERY", "TECHNICAL", "EDUCATION", "EVENTS"]);
export const jobUrgencyEnum = z.enum(["STANDARD", "URGENT", "PREMIUM"]);

export const createJobSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(5000),
  category: jobCategoryEnum,
  urgency: jobUrgencyEnum.default("STANDARD"),
  budgetMin: z.number().positive().max(1_000_000),
  budgetMax: z.number().positive().max(1_000_000),
  estimatedHours: z.number().positive().max(1000).optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  city: z.string().min(1).max(100),
  address: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isRemote: z.boolean().default(false),
}).refine((d) => d.budgetMax >= d.budgetMin, { message: "budgetMax must be >= budgetMin", path: ["budgetMax"] });

export const updateJobSchema = createJobSchema._def.schema.partial();

export const jobListQuerySchema = z.object({
  category: jobCategoryEnum.optional(),
  city: z.string().optional(),
  status: z.enum(["OPEN", "IN_REVIEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"]).optional(),
  minBudget: z.coerce.number().optional(),
  maxBudget: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(["newest", "oldest", "price_high", "price_low"]).default("newest"),
});

export const applicationSchema = z.object({
  proposedPrice: z.number().positive().max(1_000_000),
  coverLetter: z.string().min(20).max(2000),
  estimatedDays: z.number().int().positive().max(365).optional(),
});

export const respondApplicationSchema = z.object({ action: z.enum(["accept", "reject"]) });
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() });
export const messageSchema = z.object({ content: z.string().min(1).max(2000), attachmentUrl: z.string().url().optional() });

export const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  initialMessage: z.string().min(1).max(2000).optional(),
});

export const verificationSchema = z.object({
  documentType: z.enum(["national_id", "passport", "driver_license"]),
  documentNumber: z.string().min(3).max(50),
});

export const disputeSchema = z.object({
  reason: z.string().min(20).max(2000),
  evidence: z.array(z.string().url()).max(10).optional(),
});

export const checkInOutSchema = z.object({ action: z.enum(["check_in", "check_out"]) });
