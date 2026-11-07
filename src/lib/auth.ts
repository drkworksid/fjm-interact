import prisma from "@/lib/prisma";
import crypto from "crypto";

const DEFAULT_PIN = process.env.TRAINER_PIN || "262626";
const AUTH_SECRET = process.env.AUTH_SECRET || "fjm-interact-secret-auth-key-2026";

/**
 * Get active trainer PIN from database or environment fallback
 */
export async function getTrainerPin(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "TRAINER_PIN" },
    });
    if (setting && setting.value) {
      return setting.value;
    }
  } catch (e) {
    console.error("Error reading TRAINER_PIN from DB:", e);
  }
  return DEFAULT_PIN;
}

/**
 * Update trainer PIN in database
 */
export async function setTrainerPin(newPin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(newPin)) {
    throw new Error("PIN harus berupa 6 angka.");
  }
  await prisma.systemSetting.upsert({
    where: { key: "TRAINER_PIN" },
    update: { value: newPin },
    create: { key: "TRAINER_PIN", value: newPin },
  });
  return true;
}

/**
 * Create a signed session token for trainer
 */
export function createTrainerToken(): string {
  const timestamp = Date.now();
  const raw = `fjm_trainer:${timestamp}`;
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(raw).digest("hex");
  return `${raw}.${signature}`;
}

/**
 * Verify signed session token
 */
export function verifyTrainerToken(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [raw, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(raw).digest("hex");
    if (signature !== expectedSignature) return false;

    // Optional: check age (e.g. 7 days)
    const [, timestampStr] = raw.split(":");
    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - timestamp > maxAge) return false;

    return true;
  } catch (e) {
    return false;
  }
}

