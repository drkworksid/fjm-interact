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

    const surveys = await prisma.survey.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        questions: { orderBy: { order: "asc" } },
        responses: {
          include: { answers: true },
        },
      },
    });

    return NextResponse.json({ success: true, surveys });
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
      description,
      allowAnonymous = true,
      showProgress = true,
      allowBackNavigation = true,
      timeLimitSeconds,
      showResultsAfterSubmit = false,
      questions = [],
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

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: "Judul survei wajib diisi" }, { status: 400 });
    }

    const survey = await prisma.survey.create({
      data: {
        eventId: targetEventId,
        title: title.trim(),
        description: description?.trim() || null,
        status: "draft",
        allowAnonymous: Boolean(allowAnonymous),
        showProgress: Boolean(showProgress),
        allowBackNavigation: Boolean(allowBackNavigation),
        timeLimitSeconds: timeLimitSeconds ? parseInt(String(timeLimitSeconds), 10) : null,
        showResultsAfterSubmit: Boolean(showResultsAfterSubmit),
        createdBy: createdBy || null,
        questions: {
          create: (questions || []).map((q: any, idx: number) => ({
            type: q.type || "MULTIPLE_CHOICE",
            question: q.question.trim(),
            description: q.description?.trim() || null,
            order: idx,
            required: q.required !== undefined ? Boolean(q.required) : true,
            options: q.options ? (typeof q.options === "string" ? q.options : JSON.stringify(q.options)) : null,
            settings: q.settings ? (typeof q.settings === "string" ? q.settings : JSON.stringify(q.settings)) : null,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (targetEventCode) {
      broadcastToEvent(targetEventCode, "survey:created", survey);
    }

    return NextResponse.json({ success: true, survey });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
