import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { participantId, participantName, rankedOptionIds = [], isAnonymous } = body;

    if (!participantId || !participantId.trim()) {
      return NextResponse.json({ success: false, error: "Identitas peserta (token) diperlukan" }, { status: 400 });
    }

    const trimmedParticipantId = participantId.trim();

    const poll = await prisma.rankingPoll.findUnique({
      where: { id },
      include: {
        event: { select: { code: true } },
        options: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    if (poll.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Polling peringkat sedang tidak aktif atau telah ditutup" },
        { status: 400 }
      );
    }

    // Check duplicate response
    const existing = await prisma.rankingResponse.findUnique({
      where: {
        pollId_participantId: {
          pollId: id,
          participantId: trimmedParticipantId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Anda sudah mengirimkan respon ranking dan tidak dapat mengubahnya lagi." },
        { status: 400 }
      );
    }

    // Validate minimum and maximum rank items
    const totalRanked = rankedOptionIds.length;
    if (totalRanked < poll.minRankItems) {
      return NextResponse.json(
        {
          success: false,
          error: `Harap urutkan minimal ${poll.minRankItems} pilihan (saat ini ${totalRanked}).`,
        },
        { status: 400 }
      );
    }

    if (totalRanked > poll.maxRankItems) {
      return NextResponse.json(
        {
          success: false,
          error: `Maksimal pilihan yang dapat diurutkan adalah ${poll.maxRankItems}.`,
        },
        { status: 400 }
      );
    }

    // Verify option ids belong to this poll
    const validOptionIds = new Set(poll.options.map((o) => o.id));
    for (const optId of rankedOptionIds) {
      if (!validOptionIds.has(optId)) {
        return NextResponse.json({ success: false, error: "Pilihan opsi tidak valid" }, { status: 400 });
      }
    }

    let finalName = "Peserta";
    if (isAnonymous && poll.allowAnonymous) {
      finalName = "Anonim";
    } else if (participantName?.trim()) {
      finalName = participantName.trim();
    }

    // Positional scoring: Position 1 gets totalRanked, Position 2 gets totalRanked - 1, ..., last gets 1
    const answersData = rankedOptionIds.map((optId: string, idx: number) => {
      const position = idx + 1;
      const score = Math.max(1, totalRanked - idx);
      return {
        optionId: optId,
        position,
        score,
      };
    });

    const response = await prisma.rankingResponse.create({
      data: {
        pollId: id,
        participantId: trimmedParticipantId,
        participantName: finalName,
        answers: {
          create: answersData,
        },
      },
      include: {
        answers: true,
      },
    });

    if (poll.event?.code) {
      broadcastToEvent(poll.event.code, "ranking:response_added", {
        pollId: id,
        response,
      });
    }

    return NextResponse.json({
      success: true,
      response,
      message: "Respon peringkat Anda berhasil dikirim!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
