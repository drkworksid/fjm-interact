import prisma from "@/lib/prisma";
import crypto from "crypto";

const DEFAULT_PIN = process.env.TRAINER_PIN || "262626";
const AUTH_SECRET = process.env.AUTH_SECRET || "fjm-interact-secret-auth-key-2026";

export interface TrainerTokenPayload {
  isAdmin: boolean;
  events: string[];
  iat: number;
}

/**
 * Get active master trainer/admin PIN from database or environment fallback
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
 * Update master trainer/admin PIN in database
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
 * Get session-specific trainer PIN
 */
export async function getEventTrainerPin(eventCode: string): Promise<string> {
  try {
    const event = await prisma.event.findUnique({
      where: { code: eventCode.toUpperCase() },
      select: { trainerPin: true },
    });
    if (event && event.trainerPin) {
      return event.trainerPin;
    }
  } catch (e) {
    console.error(`Error reading trainerPin for event ${eventCode}:`, e);
  }
  return "262626";
}

/**
 * Update session-specific trainer PIN
 */
export async function setEventTrainerPin(eventCode: string, newPin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(newPin)) {
    throw new Error("PIN sesi harus berupa 6 angka.");
  }
  await prisma.event.update({
    where: { code: eventCode.toUpperCase() },
    data: { trainerPin: newPin },
  });
  return true;
}

/**
 * Create a signed session token for trainer / admin
 */
export function createTrainerToken(payload: { isAdmin?: boolean; events?: string[] } = {}): string {
  const data: TrainerTokenPayload = {
    isAdmin: Boolean(payload.isAdmin),
    events: (payload.events || []).map((c) => c.toUpperCase()),
    iat: Date.now(),
  };

  const raw = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(raw).digest("hex");
  return `${raw}.${signature}`;
}

/**
 * Parse and validate trainer token payload
 */
export function parseTrainerToken(token: string | undefined | null): TrainerTokenPayload | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [raw, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(raw).digest("hex");
    if (signature !== expectedSignature) return null;

    // Check if legacy raw token format: fjm_trainer:<timestamp>
    if (raw.startsWith("fjm_trainer:")) {
      const [, timestampStr] = raw.split(":");
      const timestamp = parseInt(timestampStr, 10);
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAge) return null;
      return { isAdmin: true, events: [], iat: timestamp };
    }

    // Modern JSON payload in base64url
    const jsonStr = Buffer.from(raw, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr) as TrainerTokenPayload;

    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - (data.iat || 0) > maxAge) return null;

    return {
      isAdmin: Boolean(data.isAdmin),
      events: Array.isArray(data.events) ? data.events.map((c) => c.toUpperCase()) : [],
      iat: data.iat,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Verify signed session token for a given scope
 * - If requiredEventCode is provided: allows if isAdmin is true OR event is in allowed events.
 * - If requiredEventCode is omitted: only allows if isAdmin is true (e.g. for /dashboard).
 */
export function verifyTrainerToken(
  token: string | undefined | null,
  requiredEventCode?: string
): boolean {
  const payload = parseTrainerToken(token);
  if (!payload) return false;

  // Master Admin has universal access
  if (payload.isAdmin) return true;

  // If asking for a specific event
  if (requiredEventCode) {
    return payload.events.includes(requiredEventCode.toUpperCase());
  }

  // Dashboard requires admin
  return false;
}
