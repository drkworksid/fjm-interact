import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; ideaId: string } }
) {
  try {
    const { id, ideaId } = params;
    const body = await req.json();

    const existing = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        poll: {
          include: { event: { select: { code: true } } },
        },
      },
    });

    if (!existing || existing.pollId !== id) {
      return NextResponse.json({ success: false, error: "Ide tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.idea.update({
      where: { id: ideaId },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        isPinned: body.isPinned !== undefined ? Boolean(body.isPinned) : undefined,
        content: body.content !== undefined ? String(body.content).trim() : undefined,
        category: body.category !== undefined ? (body.category ? String(body.category).trim() : null) : undefined,
      },
      include: {
        reactions: true,
      },
    });

    if (existing.poll?.event?.code) {
      broadcastToEvent(existing.poll.event.code, "ideas:idea_updated", {
        pollId: id,
        idea: updated,
      });
    }

    return NextResponse.json({ success: true, idea: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; ideaId: string } }
) {
  try {
    const { id, ideaId } = params;

    const existing = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        poll: {
          include: { event: { select: { code: true } } },
        },
      },
    });

    if (!existing || existing.pollId !== id) {
      return NextResponse.json({ success: false, error: "Ide tidak ditemukan" }, { status: 404 });
    }

    await prisma.idea.delete({ where: { id: ideaId } });

    if (existing.poll?.event?.code) {
      broadcastToEvent(existing.poll.event.code, "ideas:idea_deleted", {
        pollId: id,
        ideaId,
      });
    }

    return NextResponse.json({ success: true, message: "Ide berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

