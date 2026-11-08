import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; ideaId: string } }
) {
  try {
    const { id, ideaId } = params;
    const body = await req.json();
    const { participantId, reactionType = "UPVOTE" } = body;

    if (!participantId || !participantId.trim()) {
      return NextResponse.json({ success: false, error: "Identitas peserta (token) diperlukan" }, { status: 400 });
    }

    const trimmedParticipantId = participantId.trim();

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        poll: {
          include: { event: { select: { code: true } } },
        },
      },
    });

    if (!idea || idea.pollId !== id) {
      return NextResponse.json({ success: false, error: "Ide tidak ditemukan" }, { status: 404 });
    }

    if (!idea.poll.allowReactions) {
      return NextResponse.json(
        { success: false, error: "Reaksi dinonaktifkan untuk sesi ini" },
        { status: 400 }
      );
    }

    // Check if participant already reacted
    const existingReaction = await prisma.ideaReaction.findUnique({
      where: {
        ideaId_participantId: {
          ideaId,
          participantId: trimmedParticipantId,
        },
      },
    });

    let hasReacted = false;
    let newReactionCount = idea.reactionCount;

    if (existingReaction) {
      // Toggle off (remove reaction)
      await prisma.ideaReaction.delete({
        where: { id: existingReaction.id },
      });
      newReactionCount = Math.max(0, idea.reactionCount - 1);
      hasReacted = false;
    } else {
      // Add reaction
      await prisma.ideaReaction.create({
        data: {
          ideaId,
          participantId: trimmedParticipantId,
          reactionType,
        },
      });
      newReactionCount = idea.reactionCount + 1;
      hasReacted = true;
    }

    // Update reaction count on Idea
    const updatedIdea = await prisma.idea.update({
      where: { id: ideaId },
      data: { reactionCount: newReactionCount },
      include: { reactions: true },
    });

    if (idea.poll?.event?.code) {
      broadcastToEvent(idea.poll.event.code, "ideas:reaction_toggled", {
        pollId: id,
        ideaId,
        reactionCount: newReactionCount,
        participantId: trimmedParticipantId,
        hasReacted,
      });
    }

    return NextResponse.json({
      success: true,
      hasReacted,
      reactionCount: newReactionCount,
      idea: updatedIdea,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

