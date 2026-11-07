import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = { eventId: event.id };
    if (status) {
      whereClause.status = status;
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      include: {
        votes: true,
      },
    });

    return NextResponse.json({ success: true, questions });
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

    if (event.status === "CLOSED" || event.status === "PAUSED") {
      return NextResponse.json(
        { success: false, error: "Sesi Q&A sedang dinonaktifkan oleh moderator." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { content, authorName, isAnonymous, voterToken } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Pertanyaan tidak boleh kosong" }, { status: 400 });
    }

    const questionStatus = event.isModerationEnabled ? "PENDING" : "APPROVED";

    const question = await prisma.question.create({
      data: {
        eventId: event.id,
        content: content.trim(),
        authorName: isAnonymous ? "Anonim" : (authorName?.trim() || "Peserta"),
        isAnonymous: Boolean(isAnonymous),
        status: questionStatus,
        upvotes: 0,
      },
      include: {
        votes: true,
      },
    });

    // Auto-vote if voterToken provided
    if (voterToken) {
      try {
        await prisma.questionVote.create({
          data: {
            questionId: question.id,
            voterToken,
          },
        });
        const updated = await prisma.question.update({
          where: { id: question.id },
          data: { upvotes: 1 },
          include: { votes: true },
        });
        broadcastToEvent(code, "question:created", updated);
        return NextResponse.json({ success: true, question: updated });
      } catch (e) {
        // Continue with original question
      }
    }

    broadcastToEvent(code, "question:created", question);

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

