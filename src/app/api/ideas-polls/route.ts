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

    const polls = await prisma.ideasPoll.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        ideas: {
          orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
          include: {
            reactions: true,
          },
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
      allowAnonymous = true,
      allowReactions = true,
      allowParticipantsToSeeIdeas = true,
      moderationEnabled = false,
      maxIdeasPerParticipant = 5,
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
      return NextResponse.json({ success: false, error: "Judul dan pertanyaan ide wajib diisi" }, { status: 400 });
    }

    const poll = await prisma.ideasPoll.create({
      data: {
        eventId: targetEventId,
        title: title.trim(),
        question: question.trim(),
        description: description?.trim() || null,
        status: "draft",
        allowAnonymous: Boolean(allowAnonymous),
        allowReactions: Boolean(allowReactions),
        allowParticipantsToSeeIdeas: Boolean(allowParticipantsToSeeIdeas),
        moderationEnabled: Boolean(moderationEnabled),
        maxIdeasPerParticipant: Math.max(1, parseInt(String(maxIdeasPerParticipant), 10) || 5),
        createdBy: createdBy || null,
      },
      include: {
        ideas: true,
      },
    });

    if (targetEventCode) {
      broadcastToEvent(targetEventCode, "ideas:created", poll);
    }

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
