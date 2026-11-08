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
        questions: { orderBy: { order: "asc" } },
        responses: {
          include: {
            answers: true,
          },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ success: false, error: "Survei tidak ditemukan" }, { status: 404 });
    }

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // CSV Headers: No, Nama Peserta, Status, Waktu Mulai, Waktu Selesai, [Pertanyaan 1], [Pertanyaan 2], ...
    const headers = [
      "No",
      "Nama Peserta",
      "Status Survei",
      "Waktu Mulai",
      "Waktu Selesai",
      ...survey.questions.map((q, idx) => `Q${idx + 1}: ${escapeCsv(q.question)}`),
    ];

    const rows = survey.responses.map((resp, idx) => {
      const answersMap = new Map<string, string>();
      for (const a of resp.answers) {
        answersMap.set(a.questionId, a.value || "");
      }

      const questionAnswers = survey.questions.map((q) => {
        return escapeCsv(answersMap.get(q.id) || "");
      });

      return [
        idx + 1,
        escapeCsv(resp.participantName || "Anonim"),
        resp.completionStatus === "completed" ? "Selesai" : "Sebagian (In Progress)",
        escapeCsv(new Date(resp.startedAt).toLocaleString("id-ID")),
        resp.completedAt ? escapeCsv(new Date(resp.completedAt).toLocaleString("id-ID")) : '""',
        ...questionAnswers,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `survey-${survey.event?.code || "event"}-${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

