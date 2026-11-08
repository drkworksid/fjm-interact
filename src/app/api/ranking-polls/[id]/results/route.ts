import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateRankingResults } from "@/lib/ranking-calculator";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const poll = await prisma.rankingPoll.findUnique({
      where: { id },
      include: {
        event: { select: { code: true, title: true } },
        options: { orderBy: { order: "asc" } },
        responses: {
          include: { answers: true },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    const { results, totalParticipants } = calculateRankingResults({
      options: poll.options,
      responses: poll.responses,
    });

    return NextResponse.json({
      success: true,
      poll: {
        id: poll.id,
        title: poll.title,
        question: poll.question,
        description: poll.description,
        status: poll.status,
        minRankItems: poll.minRankItems,
        maxRankItems: poll.maxRankItems,
        showResultsToParticipants: poll.showResultsToParticipants,
        eventCode: poll.event?.code,
      },
      totalParticipants,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

