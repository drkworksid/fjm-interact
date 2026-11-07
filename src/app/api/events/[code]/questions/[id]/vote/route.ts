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
    const questionId = params.id;
    const body = await req.json();
    const { voterToken } = body;

    if (!voterToken) {
      return NextResponse.json({ success: false, error: "Identifikasi voter tidak valid" }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { votes: true },
    });

    if (!question) {
      return NextResponse.json({ success: false, error: "Pertanyaan tidak ditemukan" }, { status: 404 });
    }

    // Check if voter already voted
    const existingVote = await prisma.questionVote.findUnique({
      where: {
        questionId_voterToken: {
          questionId,
          voterToken,
        },
      },
    });

    let newUpvotes = question.upvotes;
    let hasVoted = false;

    if (existingVote) {
      // Toggle vote off
      await prisma.questionVote.delete({
        where: { id: existingVote.id },
      });
      newUpvotes = Math.max(0, question.upvotes - 1);
      hasVoted = false;
    } else {
      // Toggle vote on
      await prisma.questionVote.create({
        data: {
          questionId,
          voterToken,
        },
      });
      newUpvotes = question.upvotes + 1;
      hasVoted = true;
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { upvotes: newUpvotes },
      include: { votes: true },
    });

    broadcastToEvent(code, "question:voted", {
      questionId,
      upvotes: newUpvotes,
      question: updated,
    });

    return NextResponse.json({
      success: true,
      hasVoted,
      upvotes: newUpvotes,
      question: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

