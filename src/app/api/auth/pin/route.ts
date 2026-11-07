import { NextRequest, NextResponse } from "next/server";
import { getTrainerPin, setTrainerPin, createTrainerToken, verifyTrainerToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Check authentication status
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("fjm_trainer_token")?.value;
    const isAuthenticated = verifyTrainerToken(token);

    return NextResponse.json({
      success: true,
      authenticated: isAuthenticated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, authenticated: false, error: error.message }, { status: 500 });
  }
}

// POST: Verify 6-digit PIN and login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "Silakan masukkan 6 digit angka PIN yang valid." },
        { status: 400 }
      );
    }

    const currentPin = await getTrainerPin();

    if (pin !== currentPin) {
      return NextResponse.json(
        { success: false, error: "PIN salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    // PIN is correct, generate token
    const token = createTrainerToken();
    const res = NextResponse.json({
      success: true,
      message: "Autentikasi trainer berhasil.",
    });

    // Set HTTP cookie (valid for 7 days)
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

// PATCH: Change PIN
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("fjm_trainer_token")?.value;
    if (!verifyTrainerToken(token)) {
      return NextResponse.json({ success: false, error: "Akses ditolak. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json();
    const { oldPin, newPin } = body;

    const currentPin = await getTrainerPin();
    if (oldPin !== currentPin) {
      return NextResponse.json({ success: false, error: "PIN lama yang Anda masukkan salah." }, { status: 400 });
    }

    if (!newPin || typeof newPin !== "string" || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json({ success: false, error: "PIN baru harus berupa 6 angka." }, { status: 400 });
    }

    await setTrainerPin(newPin);

    return NextResponse.json({
      success: true,
      message: "PIN trainer berhasil diperbarui.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

