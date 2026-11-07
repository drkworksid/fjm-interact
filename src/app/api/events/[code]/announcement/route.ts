import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const body = await req.json();
    const { announcement } = body;

    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.event.update({
      where: { code },
      data: { announcement: announcement?.trim() || null },
    });

    broadcastToEvent(code, "event:announcement", {
      announcement: updated.announcement,
    });

    return NextResponse.json({ success: true, announcement: updated.announcement });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const updated = await prisma.event.update({
      where: { code },
      data: { announcement: null },
    });

    broadcastToEvent(code, "event:announcement", { announcement: null });

    return NextResponse.json({ success: true, announcement: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

