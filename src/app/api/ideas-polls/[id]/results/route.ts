import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const poll = await prisma.ideasPoll.findUnique({
      where: { id },
      include: {
        event: { select: { code: true, title: true } },
        ideas: {
          orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
          include: { reactions: true },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    const totalIdeas = poll.ideas.length;
    const uniqueParticipants = new Set(poll.ideas.map((i) => i.participantId)).size;
    const totalReactions = poll.ideas.reduce((acc, curr) => acc + curr.reactionCount, 0);

    const publishedIdeas = poll.ideas.filter((i) => i.status === "published");
    const pendingIdeas = poll.ideas.filter((i) => i.status === "pending");
    const rejectedIdeas = poll.ideas.filter((i) => i.status === "rejected");

    // Most popular idea
    const popularIdea = publishedIdeas.length > 0 ? publishedIdeas[0] : null;

    // Group by category
    const categoryMap: Record<string, number> = {};
    for (const idea of publishedIdeas) {
      const cat = idea.category || "Umum";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        question: poll.question,
        description: poll.description,
        status: poll.status,
        eventCode: poll.event?.code,
      },
      stats: {
        totalIdeas,
        uniqueParticipants,
        totalReactions,
        publishedCount: publishedIdeas.length,
        pendingCount: pendingIdeas.length,
        rejectedCount: rejectedIdeas.length,
      },
      popularIdea,
      categories: categoryMap,
      ideas: poll.ideas,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

