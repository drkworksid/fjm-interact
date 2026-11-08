import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventCode = searchParams.get("eventCode")?.toUpperCase();
    const eventId = searchParams.get("eventId");

    let whereClause: any = {};
    if (eventId) {
      whereClause.eventId = eventId;
    } else if (eventCode) {
      const event = await prisma.event.findUnique({ where: { code: eventCode } });
      if (!event) {
        return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
      }
      whereClause.eventId = event.id;
    }

    const polls = await prisma.rankingPoll.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        options: { orderBy: { order: "asc" } },
        responses: {
          include: { answers: true },
        },
      },
    });

    return NextResponse.json({ success: true, polls });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      eventCode,
      title,
      question,
      description,
      options = [],
      minRankItems = 1,
      maxRankItems = 10,
      restrictedRanking = false,
      randomizeOptions = false,
      showResultsToParticipants = true,
      allowAnonymous = true,
      scoringMethod = "positional_average",
      createdBy,
    } = body;

    let targetEventId = eventId;
    let targetEventCode = eventCode;

    if (!targetEventId && targetEventCode) {
      const event = await prisma.event.findUnique({ where: { code: targetEventCode.toUpperCase() } });
      if (!event) {
        return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
      }
      targetEventId = event.id;
    } else if (targetEventId && !targetEventCode) {
      const event = await prisma.event.findUnique({ where: { id: targetEventId } });
      if (event) targetEventCode = event.code;
    }

    if (!targetEventId) {
      return NextResponse.json({ success: false, error: "ID atau Kode Event diperlukan" }, { status: 400 });
    }

    if (!title?.trim() || !question?.trim()) {
      return NextResponse.json({ success: false, error: "Judul dan pertanyaan ranking wajib diisi" }, { status: 400 });
    }

    const cleanOptions = (options || []).filter((o: any) => {
      const label = typeof o === "string" ? o : o.label;
      return label && label.trim().length > 0;
    });

    if (cleanOptions.length < 2) {
      return NextResponse.json({ success: false, error: "Minimal harus ada 2 opsi pilihan ranking" }, { status: 400 });
    }

    const poll = await prisma.rankingPoll.create({
      data: {
        eventId: targetEventId,
        title: title.trim(),
        question: question.trim(),
        description: description?.trim() || null,
        status: "draft",
        minRankItems: Math.max(1, parseInt(String(minRankItems), 10) || 1),
        maxRankItems: Math.min(cleanOptions.length, Math.max(1, parseInt(String(maxRankItems), 10) || cleanOptions.length)),
        restrictedRanking: Boolean(restrictedRanking),
        randomizeOptions: Boolean(randomizeOptions),
        showResultsToParticipants: Boolean(showResultsToParticipants),
        allowAnonymous: Boolean(allowAnonymous),
        scoringMethod: scoringMethod || "positional_average",
        createdBy: createdBy || null,
        options: {
          create: cleanOptions.map((opt: any, idx: number) => ({
            label: typeof opt === "string" ? opt.trim() : opt.label.trim(),
            description: typeof opt === "object" && opt.description ? opt.description.trim() : null,
            imageUrl: typeof opt === "object" && opt.imageUrl ? opt.imageUrl.trim() : null,
            order: idx,
          })),
        },
      },
      include: {
        options: { orderBy: { order: "asc" } },
      },
    });

    if (targetEventCode) {
      broadcastToEvent(targetEventCode, "ranking:created", poll);
    }

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

