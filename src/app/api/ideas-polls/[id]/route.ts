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
    const poll = await prisma.ideasPoll.findUnique({
      where: { id },
      include: {
        event: { select: { code: true, title: true } },
        ideas: {
          orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
          include: {
            reactions: true,
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
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

    const existing = await prisma.ideasPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.ideasPoll.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        question: body.question !== undefined ? String(body.question).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        allowAnonymous: body.allowAnonymous !== undefined ? Boolean(body.allowAnonymous) : undefined,
        allowReactions: body.allowReactions !== undefined ? Boolean(body.allowReactions) : undefined,
        allowParticipantsToSeeIdeas: body.allowParticipantsToSeeIdeas !== undefined ? Boolean(body.allowParticipantsToSeeIdeas) : undefined,
        moderationEnabled: body.moderationEnabled !== undefined ? Boolean(body.moderationEnabled) : undefined,
        maxIdeasPerParticipant: body.maxIdeasPerParticipant !== undefined ? Math.max(1, parseInt(String(body.maxIdeasPerParticipant), 10)) : undefined,
      },
      include: {
        ideas: {
          include: { reactions: true },
        },
      },
    });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ideas:updated", updated);
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
    const existing = await prisma.ideasPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    await prisma.ideasPoll.delete({ where: { id } });

    if (existing.event?.code) {
      broadcastToEvent(existing.event.code, "ideas:deleted", { id });
    }

    return NextResponse.json({ success: true, message: "Ideas Poll berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
