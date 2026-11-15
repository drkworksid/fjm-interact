import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const pollId = params.id;

    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
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

    if (!poll) {
      return NextResponse.json({ success: false, error: "Polling tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const pollId = params.id;
    const body = await req.json();
    const { title, imageUrl, type, options, hasCorrectAnswer, timerSeconds } = body;

    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    const existingPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!existingPoll) {
      return NextResponse.json({ success: false, error: "Polling tidak ditemukan" }, { status: 404 });
    }

    // Determine hasCorrectAnswer
    const hasAnyCorrect = Boolean(
      hasCorrectAnswer ||
      (options || []).some((o: any) => typeof o === "object" && o !== null && Boolean(o.isCorrect))
    );

    // Update poll basic info
    await prisma.poll.update({
      where: { id: pollId },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl ? String(imageUrl).trim() : null) : undefined,
        type: type !== undefined ? type : undefined,
        hasCorrectAnswer: hasAnyCorrect,
        timerSeconds: timerSeconds !== undefined ? parseInt(String(timerSeconds), 10) : undefined,
      },
    });

    // Update options if provided
    if (Array.isArray(options)) {
      const existingOptions = existingPoll.options;
      const incomingIds = options
        .filter((o: any) => typeof o === "object" && o !== null && o.id)
        .map((o: any) => o.id);

      // Delete options that were removed
      const toDelete = existingOptions.filter((o) => !incomingIds.includes(o.id));
      if (toDelete.length > 0) {
        await prisma.pollOption.deleteMany({
          where: { id: { in: toDelete.map((o) => o.id) } },
        });
      }

      // Upsert options
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const isObj = typeof opt === "object" && opt !== null;
        const text = isObj ? opt.text : String(opt);
        if (!text || !text.trim()) continue;

        const isCorrect = isObj ? Boolean(opt.isCorrect) : false;
        const pointValue = isObj && opt.pointValue !== undefined
          ? parseInt(String(opt.pointValue), 10)
          : (isCorrect ? 10 : 0);

        if (isObj && opt.id && existingOptions.some((eo) => eo.id === opt.id)) {
          await prisma.pollOption.update({
            where: { id: opt.id },
            data: {
              optionText: text.trim(),
              isCorrect,
              pointValue,
              orderIndex: i,
            },
          });
        } else {
          await prisma.pollOption.create({
            data: {
              pollId,
              optionText: text.trim(),
              isCorrect,
              pointValue,
              orderIndex: i,
            },
          });
        }
      }
    }

    // Fetch refreshed poll
    const refreshed = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { orderIndex: "asc" },
          include: { _count: { select: { responses: true } } },
        },
        responses: true,
      },
    });

    broadcastToEvent(code, "poll:status_updated", refreshed);

    return NextResponse.json({ success: true, poll: refreshed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
