import { JobCategory, JobUrgency } from "@prisma/client";
import { env } from "../config/env";

export function getCommissionRate(category: JobCategory, urgency: JobUrgency): number {
  if (category === "EVENTS") return env.COMMISSION.EVENTS;
  if (urgency === "URGENT" || urgency === "PREMIUM") return env.COMMISSION.URGENT;
  return env.COMMISSION.STANDARD;
}
export function calculateAmounts(price: number, rate: number) {
  const commission = +(price * (rate / 100)).toFixed(2);
  const workerAmount = +(price - commission).toFixed(2);
  return { commission, workerAmount };
}
