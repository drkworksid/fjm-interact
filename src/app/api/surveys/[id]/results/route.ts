import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        event: { select: { code: true, title: true } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: true,
          },
        },
        responses: {
          include: { answers: true },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ success: false, error: "Survei tidak ditemukan" }, { status: 404 });
    }

    const totalParticipants = survey.responses.length;
    const completedResponses = survey.responses.filter((r) => r.completionStatus === "completed");
    const completedCount = completedResponses.length;
    const completionRate = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

    // Calculate average completion time in seconds
    let totalDurationSeconds = 0;
    let timedCount = 0;
    for (const r of completedResponses) {
      if (r.completedAt && r.startedAt) {
        const diff = Math.max(0, Math.floor((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000));
        totalDurationSeconds += diff;
        timedCount++;
      }
    }
    const avgDurationSeconds = timedCount > 0 ? Math.round(totalDurationSeconds / timedCount) : 0;

    // Process breakdown per question
    const questionAnalytics = survey.questions.map((q) => {
      const answers = q.answers || [];
      const totalAnswers = answers.length;

      let analysis: any = {};

      if (q.type === "MULTIPLE_CHOICE") {
        let parsedOptions: string[] = [];
        try {
          parsedOptions = q.options ? JSON.parse(q.options) : [];
        } catch {
          parsedOptions = [];
        }

        const counts: Record<string, number> = {};
        for (const opt of parsedOptions) {
          counts[opt] = 0;
        }
        for (const ans of answers) {
          if (ans.value) {
            counts[ans.value] = (counts[ans.value] || 0) + 1;
          }
        }
        analysis = { options: parsedOptions, counts };
      } else if (q.type === "RATING") {
        const numericValues = answers
          .map((a) => (a.value ? parseFloat(a.value) : NaN))
          .filter((v) => !isNaN(v));
        const avg = numericValues.length > 0 ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(1) : "0.0";
        const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const val of numericValues) {
          const star = Math.round(val);
          if (starCounts[star] !== undefined) starCounts[star]++;
        }
        analysis = { averageRating: parseFloat(avg), starCounts };
      } else if (q.type === "WORD_CLOUD") {
        const wordFreq: Record<string, number> = {};
        for (const ans of answers) {
          if (ans.value) {
            const word = ans.value.trim().toLowerCase();
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          }
        }
        analysis = { wordFrequency: wordFreq };
      } else if (q.type === "OPEN_TEXT") {
        const textResponses = answers
          .filter((a) => a.value && a.value.trim().length > 0)
          .map((a) => a.value);
        analysis = { textResponses };
      } else if (q.type === "RANKING") {
        analysis = { responsesCount: totalAnswers };
      }

      return {
        id: q.id,
        type: q.type,
        question: q.question,
        description: q.description,
        order: q.order,
        required: q.required,
        totalAnswers,
        analysis,
      };
    });

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        eventCode: survey.event?.code,
      },
      stats: {
        totalParticipants,
        completedCount,
        completionRate,
        avgDurationSeconds,
      },
      questionAnalytics,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
