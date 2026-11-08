import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { id, questionId } = params;
    const body = await req.json();

    const existing = await prisma.surveyQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing || existing.surveyId !== id) {
      return NextResponse.json({ success: false, error: "Pertanyaan tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.surveyQuestion.update({
      where: { id: questionId },
      data: {
        type: body.type !== undefined ? body.type : undefined,
        question: body.question !== undefined ? String(body.question).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
        order: body.order !== undefined ? Number(body.order) : undefined,
        required: body.required !== undefined ? Boolean(body.required) : undefined,
        options: body.options !== undefined ? (typeof body.options === "string" ? body.options : JSON.stringify(body.options)) : undefined,
        settings: body.settings !== undefined ? (typeof body.settings === "string" ? body.settings : JSON.stringify(body.settings)) : undefined,
      },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const { id, questionId } = params;

    const existing = await prisma.surveyQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing || existing.surveyId !== id) {
      return NextResponse.json({ success: false, error: "Pertanyaan tidak ditemukan" }, { status: 404 });
    }

    await prisma.surveyQuestion.delete({ where: { id: questionId } });

    return NextResponse.json({ success: true, message: "Pertanyaan berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

