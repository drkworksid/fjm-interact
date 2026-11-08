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
    const {
      participantId,
      participantName,
      isAnonymous = false,
      completionStatus = "completed",
      answers = [],
    } = body;

    if (!participantId || !participantId.trim()) {
      return NextResponse.json({ success: false, error: "Identitas peserta (token) diperlukan" }, { status: 400 });
    }

    const trimmedParticipantId = participantId.trim();

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        event: { select: { code: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!survey) {
      return NextResponse.json({ success: false, error: "Survei tidak ditemukan" }, { status: 404 });
    }

    if (survey.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Survei saat ini sedang tidak aktif atau telah ditutup" },
        { status: 400 }
      );
    }

    // Check existing response
    const existingResponse = await prisma.surveyResponse.findUnique({
      where: {
        surveyId_participantId: {
          surveyId: id,
          participantId: trimmedParticipantId,
        },
      },
      include: { answers: true },
    });

    if (existingResponse?.completionStatus === "completed" && completionStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "Anda sudah menyelesaikan survei ini sebelumnya." },
        { status: 400 }
      );
    }

    // Validation for completed submission: required questions
    if (completionStatus === "completed") {
      const answersMap = new Map<string, any>();
      // Preload existing answers if any
      if (existingResponse?.answers) {
        for (const a of existingResponse.answers) {
          answersMap.set(a.questionId, a.value);
        }
      }
      for (const a of answers) {
        answersMap.set(a.questionId, a.value);
      }

      for (const q of survey.questions) {
        if (q.required) {
          const val = answersMap.get(q.id);
          const isEmpty = val === undefined || val === null || String(val).trim() === "";
          if (isEmpty) {
            return NextResponse.json(
              {
                success: false,
                error: `Pertanyaan wajib no. ${q.order + 1} ("${q.question}") belum dijawab.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    let finalName = "Peserta";
    if (isAnonymous && survey.allowAnonymous) {
      finalName = "Anonim";
    } else if (participantName?.trim()) {
      finalName = participantName.trim();
    }

    // Upsert SurveyResponse
    const response = await prisma.surveyResponse.upsert({
      where: {
        surveyId_participantId: {
          surveyId: id,
          participantId: trimmedParticipantId,
        },
      },
      create: {
        surveyId: id,
        participantId: trimmedParticipantId,
        participantName: finalName,
        completionStatus,
        completedAt: completionStatus === "completed" ? new Date() : null,
      },
      update: {
        participantName: finalName,
        completionStatus,
        completedAt: completionStatus === "completed" ? new Date() : undefined,
      },
    });

    // Upsert Answers
    for (const ans of answers) {
      if (!ans.questionId) continue;
      await prisma.surveyAnswer.upsert({
        where: {
          responseId_questionId: {
            responseId: response.id,
            questionId: ans.questionId,
          },
        },
        create: {
          responseId: response.id,
          questionId: ans.questionId,
          value: ans.value !== undefined ? String(ans.value) : null,
          metadata: ans.metadata ? (typeof ans.metadata === "string" ? ans.metadata : JSON.stringify(ans.metadata)) : null,
        },
        update: {
          value: ans.value !== undefined ? String(ans.value) : null,
          metadata: ans.metadata ? (typeof ans.metadata === "string" ? ans.metadata : JSON.stringify(ans.metadata)) : null,
        },
      });
    }

    if (survey.event?.code) {
      broadcastToEvent(survey.event.code, "survey:response_updated", {
        surveyId: id,
        participantId: trimmedParticipantId,
        completionStatus,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        completionStatus === "completed"
          ? "Terima kasih! Seluruh jawaban survei Anda telah berhasil dikirim."
          : "Progres survei berhasil disimpan otomatis.",
      response,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
