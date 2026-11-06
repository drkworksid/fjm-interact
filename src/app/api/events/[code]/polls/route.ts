import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    const polls = await prisma.poll.findMany({
      where: { eventId: event.id },
      orderBy: { orderIndex: "asc" },
      include: {
        options: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: {
              select: { responses: true },
            },
          },
        },
        responses: true,
      },
    });

    return NextResponse.json({ success: true, polls });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { title, type, options, isActive, timerSeconds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Judul polling harus diisi" }, { status: 400 });
    }

    // Count existing polls for ordering
    const pollCount = await prisma.poll.count({ where: { eventId: event.id } });

    // If activating this poll, deactivate other polls
    if (isActive) {
      await prisma.poll.updateMany({
        where: { eventId: event.id },
        data: { isActive: false },
      });
    }

    const poll = await prisma.poll.create({
      data: {
        eventId: event.id,
        title: title.trim(),
        type: type || "MULTIPLE_CHOICE",
        isActive: Boolean(isActive),
        timerSeconds: timerSeconds ? parseInt(timerSeconds, 10) : 0,
        quizState: "QUESTION",
        orderIndex: pollCount,
        options: {
          create: (options || []).map((opt: any, idx: number) => {
            const isObj = typeof opt === "object" && opt !== null;
            return {
              optionText: isObj ? opt.text : String(opt),
              isCorrect: isObj ? Boolean(opt.isCorrect) : false,
              orderIndex: idx,
            };
          }),
        },
      },
      include: {
        options: {
          include: {
            _count: { select: { responses: true } },
          },
        },
        responses: true,
      },
    });

    broadcastToEvent(code, "poll:created", poll);

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

