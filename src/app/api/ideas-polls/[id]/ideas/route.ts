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
    const { content, participantId, authorName, category, isAnonymous } = body;

    if (!participantId || !participantId.trim()) {
      return NextResponse.json({ success: false, error: "Identitas peserta (token) diperlukan" }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Isi ide tidak boleh kosong" }, { status: 400 });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { success: false, error: "Panjang ide maksimal 500 karakter" },
        { status: 400 }
      );
    }

    const poll = await prisma.ideasPoll.findUnique({
      where: { id },
      include: { event: { select: { code: true } } },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    if (poll.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Pengumpulan ide sedang tidak aktif atau telah ditutup" },
        { status: 400 }
      );
    }

    // Check maximum ideas limit per participant
    const countByUser = await prisma.idea.count({
      where: { pollId: id, participantId: participantId.trim() },
    });

    if (countByUser >= poll.maxIdeasPerParticipant) {
      return NextResponse.json(
        {
          success: false,
          error: `Anda telah mencapai batas maksimum ${poll.maxIdeasPerParticipant} ide untuk sesi ini.`,
        },
        { status: 400 }
      );
    }

    // Determine initial status based on moderation setting
    const initialStatus = poll.moderationEnabled ? "pending" : "published";

    // Participant name formatting
    let finalAuthorName = "Peserta";
    if (isAnonymous && poll.allowAnonymous) {
      finalAuthorName = "Anonim";
    } else if (authorName?.trim()) {
      finalAuthorName = authorName.trim();
    }

    const idea = await prisma.idea.create({
      data: {
        pollId: id,
        participantId: participantId.trim(),
        authorName: finalAuthorName,
        content: trimmedContent,
        category: category?.trim() || null,
        status: initialStatus,
        reactionCount: 0,
        isPinned: false,
      },
      include: {
        reactions: true,
      },
    });

    if (poll.event?.code) {
      broadcastToEvent(poll.event.code, "ideas:idea_added", { pollId: id, idea });
    }

    return NextResponse.json({
      success: true,
      idea,
      message:
        initialStatus === "pending"
          ? "Ide Anda berhasil dikirim dan sedang menunggu persetujuan moderator."
          : "Ide Anda berhasil dipublikasikan!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
