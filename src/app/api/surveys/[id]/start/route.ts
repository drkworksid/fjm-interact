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
    const existing = await prisma.survey.findUnique({
      where: { id },
      include: { event: { select: { id: true, code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Survei tidak ditemukan" }, { status: 404 });
    }

    // Set other surveys in this event to paused if active
    await prisma.survey.updateMany({
      where: { eventId: existing.eventId, id: { not: id }, status: "active" },
      data: { status: "paused" },
    });

    const updated = await prisma.survey.update({
      where: { id },
      data: {
        status: "active",
        startAt: new Date(),
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        responses: { include: { answers: true } },
      },
    });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "survey:status_updated", updated);
    }

    return NextResponse.json({ success: true, survey: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
