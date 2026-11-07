import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const pollId = params.id;
    const body = await req.json();
    const { optionId, textResponse, ratingValue, participantToken, participantName } = body;

    if (!participantToken) {
      return NextResponse.json({ success: false, error: "Identifikasi voter diperlukan" }, { status: 400 });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: { select: { responses: true } },
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Polling tidak ditemukan" }, { status: 404 });
    }

    if (!poll.isActive) {
      return NextResponse.json({ success: false, error: "Polling sedang tidak aktif" }, { status: 400 });
    }

    if (poll.isLocked) {
      return NextResponse.json({ success: false, error: "Polling telah dikunci. Jawaban tidak dapat dikirim." }, { status: 400 });
    }

    // Check if participant already responded to this poll
    const existing = await prisma.pollResponse.findFirst({
      where: {
        pollId,
        participantToken,
      },
    });

    if (existing) {
      if (poll.type === "MULTIPLE_CHOICE" || poll.type === "QUIZ" || poll.type === "RATING") {
        return NextResponse.json(
          { success: false, error: "Jawaban telah dikirim dan tidak dapat diubah lagi." },
          { status: 400 }
        );
      }
      // Update existing response
      await prisma.pollResponse.update({
        where: { id: existing.id },
        data: {
          optionId: optionId || null,
          textResponse: textResponse || null,
          ratingValue: ratingValue !== undefined ? ratingValue : null,
          participantName: participantName || null,
        },
      });
    } else {
      // Create new response
      await prisma.pollResponse.create({
        data: {
          pollId,
          optionId: optionId || null,
          textResponse: textResponse || null,
          ratingValue: ratingValue !== undefined ? ratingValue : null,
          participantToken,
          participantName: participantName || null,
        },
      });
    }

    // Fetch updated poll with counts and responses
    const updatedPoll = await prisma.poll.findUnique({
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

    broadcastToEvent(code, "poll:voted", updatedPoll);

    return NextResponse.json({ success: true, poll: updatedPoll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

