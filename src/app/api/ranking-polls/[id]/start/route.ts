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
    const existing = await prisma.rankingPoll.findUnique({
      where: { id },
      include: { event: { select: { id: true, code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    // Set other ranking polls in the same event to paused/closed if active
    await prisma.rankingPoll.updateMany({
      where: { eventId: existing.eventId, id: { not: id }, status: "active" },
      data: { status: "paused" },
    });

    const updated = await prisma.rankingPoll.update({
      where: { id },
      data: { status: "active" },
      include: {
        options: { orderBy: { order: "asc" } },
        responses: { include: { answers: true } },
      },
    });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ranking:status_updated", updated);
    }

    return NextResponse.json({ success: true, poll: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

