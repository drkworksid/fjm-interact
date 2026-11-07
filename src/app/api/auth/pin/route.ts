import { NextRequest, NextResponse } from "next/server";
import {
  getTrainerPin,
  setTrainerPin,
  getEventTrainerPin,
  setEventTrainerPin,
  createTrainerToken,
  parseTrainerToken,
  verifyTrainerToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Check authentication status (optionally for a specific event)
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("fjm_trainer_token")?.value;
    const url = new URL(req.url);
    const eventCode = url.searchParams.get("eventCode") || undefined;

    const payload = parseTrainerToken(token);
    const isAuthenticated = verifyTrainerToken(token, eventCode);

    return NextResponse.json({
      success: true,
      authenticated: isAuthenticated,
      isAdmin: Boolean(payload?.isAdmin),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, authenticated: false, error: error.message }, { status: 500 });
  }
}

// POST: Verify 6-digit PIN and login (either via Master PIN or Session-specific PIN)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;
    const eventCode = body.eventCode ? String(body.eventCode).trim().toUpperCase() : undefined;

    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "Silakan masukkan 6 digit angka PIN yang valid." },
        { status: 400 }
      );
    }

    const currentToken = req.cookies.get("fjm_trainer_token")?.value;
    const currentPayload = parseTrainerToken(currentToken);

    // 1. Check Master Admin PIN
    const masterPin = await getTrainerPin();
    if (pin === masterPin) {
      // Unlocks Admin everywhere
      const existingEvents = currentPayload?.events || [];
      const newEvents = eventCode
        ? Array.from(new Set([...existingEvents, eventCode]))
        : existingEvents;

      const token = createTrainerToken({ isAdmin: true, events: newEvents });

      const res = NextResponse.json({
        success: true,
        isAdmin: true,
        message: "Autentikasi Master Admin berhasil. Akses penuh terbuka.",
      });

      res.cookies.set({
        name: "fjm_trainer_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      return res;
    }

    // 2. Check Session-Specific PIN if eventCode provided
    if (eventCode) {
      const sessionPin = await getEventTrainerPin(eventCode);
      if (pin === sessionPin) {
        const existingEvents = currentPayload?.events || [];
        const newEvents = Array.from(new Set([...existingEvents, eventCode]));

        const token = createTrainerToken({
          isAdmin: Boolean(currentPayload?.isAdmin),
          events: newEvents,
        });

        const res = NextResponse.json({
          success: true,
          isAdmin: false,
          message: `Autentikasi Trainer Sesi #${eventCode} berhasil.`,
        });

        res.cookies.set({
          name: "fjm_trainer_token",
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: "/",
        });

        return res;
      }

      return NextResponse.json(
        {
          success: false,
          error: `PIN salah untuk Sesi #${eventCode}. Masukkan PIN khusus sesi ini atau Master PIN Admin.`,
        },
        { status: 401 }
      );
    }

    // Neither master PIN nor session eventCode matched
    return NextResponse.json(
      { success: false, error: "Master PIN salah. Silakan coba lagi." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Logout trainer / Lock PIN
export async function DELETE() {
  try {
    const res = NextResponse.json({
      success: true,
      message: "Sesi trainer berhasil dikunci.",
    });

    res.cookies.set({
      name: "fjm_trainer_token",
      value: "",
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Change PIN (Session PIN or Master PIN)
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("fjm_trainer_token")?.value;
    const body = await req.json();
    const { oldPin, newPin } = body;
    const eventCode = body.eventCode ? String(body.eventCode).trim().toUpperCase() : undefined;

    if (!newPin || typeof newPin !== "string" || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json({ success: false, error: "PIN baru harus berupa 6 digit angka." }, { status: 400 });
    }

    // Check if updating Session PIN
    if (eventCode) {
      if (!verifyTrainerToken(token, eventCode)) {
        return NextResponse.json({ success: false, error: "Akses ditolak. Silakan login ke sesi terlebih dahulu." }, { status: 401 });
      }

      const currentSessionPin = await getEventTrainerPin(eventCode);
      const masterPin = await getTrainerPin();

      // Can verify with current session PIN or master PIN
      if (oldPin !== currentSessionPin && oldPin !== masterPin) {
        return NextResponse.json({ success: false, error: "PIN lama yang Anda masukkan salah." }, { status: 400 });
      }

      await setEventTrainerPin(eventCode, newPin);

      return NextResponse.json({
        success: true,
        message: `PIN Trainer Sesi #${eventCode} berhasil diperbarui.`,
      });
    }

    // Updating Master PIN
    const payload = parseTrainerToken(token);
    if (!payload?.isAdmin) {
      return NextResponse.json({ success: false, error: "Hanya Master Admin yang dapat mengubah Master PIN." }, { status: 403 });
    }

    const currentMasterPin = await getTrainerPin();
    if (oldPin !== currentMasterPin) {
      return NextResponse.json({ success: false, error: "PIN Master lama yang Anda masukkan salah." }, { status: 400 });
    }

    await setTrainerPin(newPin);

    return NextResponse.json({
      success: true,
      message: "Master PIN Trainer berhasil diperbarui.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
