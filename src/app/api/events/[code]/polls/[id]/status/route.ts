import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const pollId = params.id;
    const body = await req.json();
    const { isActive, showResults } = body;

    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    if (isActive) {
      // Deactivate all other polls for this event
      await prisma.poll.updateMany({
        where: { eventId: event.id, id: { not: pollId } },
        data: { isActive: false },
      });
    }

    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        isActive: isActive !== undefined ? isActive : undefined,
        showResults: showResults !== undefined ? showResults : undefined,
      },
      include: {
        options: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { responses: true } },
          },
        },
        responses: true,
      },
    });

    broadcastToEvent(code, "poll:status_updated", updatedPoll);

    return NextResponse.json({ success: true, poll: updatedPoll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const pollId = params.id;

    await prisma.poll.delete({ where: { id: pollId } });

    broadcastToEvent(code, "poll:deleted", { pollId });

    return NextResponse.json({ success: true, pollId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

