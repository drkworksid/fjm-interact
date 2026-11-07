import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { broadcastToEvent } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const questionId = params.id;
    const body = await req.json();
    const { status, isHighlighted } = body;

    const event = await prisma.event.findUnique({ where: { code } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    let updatedQuestion = null;

    if (status) {
      updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: { status },
        include: { votes: true },
      });

      broadcastToEvent(code, "question:status_updated", updatedQuestion);
    }

    if (isHighlighted !== undefined) {
      const nextHighlightId = isHighlighted ? questionId : null;
      await prisma.event.update({
        where: { id: event.id },
        data: { highlightedQuestionId: nextHighlightId },
      });

      broadcastToEvent(code, "event:highlighted", {
        questionId: nextHighlightId,
      });
    }

    return NextResponse.json({ success: true, question: updatedQuestion });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string; id: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const questionId = params.id;

    await prisma.question.delete({
      where: { id: questionId },
    });

    broadcastToEvent(code, "question:deleted", { questionId });

    return NextResponse.json({ success: true, questionId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

