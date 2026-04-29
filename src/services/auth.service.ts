import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { isEligibleAge, calculateAge } from "../utils/age";
import { z } from "zod";
import { registerSchema, loginSchema } from "../validators/schemas";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export const authService = {
  async register(input: RegisterInput) {
    if (!isEligibleAge(input.dateOfBirth)) {
      throw ApiError.badRequest(`Age must be between 16 and 40 (yours: ${calculateAge(input.dateOfBirth)})`);
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) throw ApiError.conflict("Email or username already registered");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email, username: input.username, fullName: input.fullName,
        passwordHash, phone: input.phone, dateOfBirth: input.dateOfBirth, city: input.city,
      },
    });
    return this.issueTokens(user.id, user.role);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) throw ApiError.unauthorized("Invalid credentials");
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized("Invalid credentials");
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user.id, user.role);
  },

  async issueTokens(userId: string, role: string) {
    const accessToken = signAccessToken({ userId, role });
    const refreshToken = signRefreshToken({ userId, role });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) throw ApiError.unauthorized("Invalid refresh token");
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(payload.userId, payload.role);
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({ where: { token: refreshToken, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
