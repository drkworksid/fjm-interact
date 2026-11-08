import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { type = "MULTIPLE_CHOICE", question, description, required = true, options, settings } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ success: false, error: "Pertanyaan survei wajib diisi" }, { status: 400 });
    }

    const currentCount = await prisma.surveyQuestion.count({ where: { surveyId: id } });

    const newQuestion = await prisma.surveyQuestion.create({
      data: {
        surveyId: id,
        type,
        question: question.trim(),
        description: description?.trim() || null,
        order: currentCount,
        required: Boolean(required),
        options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
        settings: settings ? (typeof settings === "string" ? settings : JSON.stringify(settings)) : null,
      },
    });

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
