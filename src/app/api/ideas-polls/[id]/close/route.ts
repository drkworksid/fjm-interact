import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = await prisma.ideasPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.ideasPoll.update({
      where: { id },
      data: { status: "closed" },
      include: {
        ideas: {
          include: { reactions: true },
        },
      },
    });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ideas:status_updated", updated);
    }

    return NextResponse.json({ success: true, poll: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

