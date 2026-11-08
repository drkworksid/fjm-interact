import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateRankingResults } from "@/lib/ranking-calculator";

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
          include: {
            answers: {
              include: { option: true },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ranking Poll tidak ditemukan" }, { status: 404 });
    }

    const { results, totalParticipants } = calculateRankingResults({
      options: poll.options,
      responses: poll.responses,
    });

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // SECTION 1: Ringkasan Skor Peringkat
    const summaryHeaders = ["Peringkat Akhir", "Opsi Pilihan", "Skor Rata-rata (Avg)", "Total Poin", "Jumlah Suara"];
    const summaryRows = results.map((r) => [
      r.rank,
      escapeCsv(r.label),
      r.averageScore.toFixed(2),
      r.totalScore,
      r.voteCount,
    ]);

    // SECTION 2: Rincian Respon Peserta
    const detailHeaders = ["No", "Nama Peserta", "Waktu Kirim", "Urutan Peringkat"];
    const detailRows = poll.responses.map((resp, idx) => {
      const formattedAnswers = resp.answers
        .map((a) => `#${a.position} ${a.option.label}`)
        .join(" > ");

      return [
        idx + 1,
        escapeCsv(resp.participantName || "Anonim"),
        escapeCsv(new Date(resp.submittedAt).toLocaleString("id-ID")),
        escapeCsv(formattedAnswers),
      ];
    });

    const csvContent =
      "\uFEFF" +
      "=== HASIL SKOR RATA-RATA RANKING ===\n" +
      summaryHeaders.join(",") +
      "\n" +
      summaryRows.map((r) => r.join(",")).join("\n") +
      "\n\n=== RINCIAN SUARA PESERTA ===\n" +
      detailHeaders.join(",") +
      "\n" +
      detailRows.map((r) => r.join(",")).join("\n");

    const filename = `ranking-${poll.event?.code || "event"}-${Date.now()}.csv`;

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
