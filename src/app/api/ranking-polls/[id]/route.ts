import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

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

    return NextResponse.json({ success: true, poll });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.rankingPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    // If options are provided, update them
    if (Array.isArray(body.options)) {
      const cleanOptions = body.options.filter((o: any) => {
        const label = typeof o === "string" ? o : o.label;
        return label && label.trim().length > 0;
      });

      // Delete old options and recreate
      await prisma.rankingOption.deleteMany({ where: { pollId: id } });
      await prisma.rankingOption.createMany({
        data: cleanOptions.map((opt: any, idx: number) => ({
          pollId: id,
          label: typeof opt === "string" ? opt.trim() : opt.label.trim(),
          description: typeof opt === "object" && opt.description ? opt.description.trim() : null,
          imageUrl: typeof opt === "object" && opt.imageUrl ? opt.imageUrl.trim() : null,
          order: idx,
        })),
      });
    }

    const updated = await prisma.rankingPoll.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        question: body.question !== undefined ? String(body.question).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        minRankItems: body.minRankItems !== undefined ? Math.max(1, parseInt(String(body.minRankItems), 10)) : undefined,
        maxRankItems: body.maxRankItems !== undefined ? Math.max(1, parseInt(String(body.maxRankItems), 10)) : undefined,
        restrictedRanking: body.restrictedRanking !== undefined ? Boolean(body.restrictedRanking) : undefined,
        randomizeOptions: body.randomizeOptions !== undefined ? Boolean(body.randomizeOptions) : undefined,
        showResultsToParticipants: body.showResultsToParticipants !== undefined ? Boolean(body.showResultsToParticipants) : undefined,
        allowAnonymous: body.allowAnonymous !== undefined ? Boolean(body.allowAnonymous) : undefined,
      },
      include: {
        options: { orderBy: { order: "asc" } },
        responses: { include: { answers: true } },
      },
    });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ranking:updated", updated);
    }

    return NextResponse.json({ success: true, poll: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const existing = await prisma.rankingPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    await prisma.rankingPoll.delete({ where: { id } });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ranking:deleted", { id });
    }

    return NextResponse.json({ success: true, message: "Ranking Poll berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

