import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            questions: true,
            polls: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, passcode, isModerationEnabled, isAnonymousAllowed } = body;

    let code = (body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) {
      code = "TR" + Math.floor(1000 + Math.random() * 9000);
    }

    // Check duplicate code
    const existing = await prisma.event.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Kode event #${code} sudah digunakan. Silakan pilih kode lain.` }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        code,
        title: title || `Training Session #${code}`,
        description: description || "",
        passcode: passcode || null,
        isModerationEnabled: Boolean(isModerationEnabled),
        isAnonymousAllowed: isAnonymousAllowed !== undefined ? Boolean(isAnonymousAllowed) : true,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

