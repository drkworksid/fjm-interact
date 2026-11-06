import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "qa"; // "qa" or "polls"

    const event = await prisma.event.findUnique({
      where: { code },
      include: {
        questions: {
          orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
        },
        polls: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
              include: {
                _count: { select: { responses: true } },
              },
            },
            responses: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: "Event tidak ditemukan" }, { status: 404 });
    }

    // CSV UTF-8 BOM so Excel opens accurately with UTF-8 encoding
    const BOM = "\uFEFF";

    if (type === "qa") {
      let csv = BOM + "No,Waktu,Penanya,Tipe,Pertanyaan,Jumlah Upvotes,Status Terjawab\n";
      event.questions.forEach((q, idx) => {
        const time = new Date(q.createdAt).toLocaleString("id-ID");
        const author = q.isAnonymous ? "Anonim" : `"${q.authorName.replace(/"/g, '""')}"`;
        const anonType = q.isAnonymous ? "Anonim" : "Terbuka";
        const content = `"${q.content.replace(/"/g, '""')}"`;
        const answered = q.status === "ANSWERED" ? "Sudah Terjawab" : "Belum Terjawab";

        csv += `${idx + 1},"${time}",${author},${anonType},${content},${q.upvotes},${answered}\n`;
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${event.code}-Audience-QA.csv"`,
        },
      });
    }

    if (type === "polls") {
      let csv = BOM + `Laporan Hasil Polling Sesi: ${event.title} (#${event.code})\n\n`;

      event.polls.forEach((p, pIdx) => {
        csv += `Polling #${pIdx + 1}: "${p.title.replace(/"/g, '""')}"\n`;
        csv += `Tipe: ${p.type}, Total Suara: ${p.responses.length}\n`;

        if (p.type === "MULTIPLE_CHOICE" || p.type === "QUIZ") {
          csv += "Opsi Jawaban,Jumlah Suara,Persentase,Kunci Jawaban Benar\n";
          const total = p.responses.length;
          p.options.forEach((opt) => {
            const count = p.responses.filter((r) => r.optionId === opt.id).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isCorrect = opt.isCorrect ? "YA" : "TIDAK";
            csv += `"${opt.optionText.replace(/"/g, '""')}",${count},${pct}%,${isCorrect}\n`;
          });
        } else if (p.type === "WORD_CLOUD" || p.type === "OPEN_TEXT") {
          csv += "No,Nama Peserta,Jawaban / Kata Kunci,Waktu\n";
          p.responses.forEach((r, rIdx) => {
            const rTime = new Date(r.createdAt).toLocaleString("id-ID");
            const rAuthor = r.participantName || "Peserta";
            csv += `${rIdx + 1},"${rAuthor}","${(r.textResponse || "").replace(/"/g, '""')}","${rTime}"\n`;
          });
        } else if (p.type === "RATING") {
          const total = p.responses.length;
          const avg = total > 0 ? (p.responses.reduce((acc, r) => acc + (r.ratingValue || 0), 0) / total).toFixed(2) : "0";
          csv += `Rata-rata Rating: ${avg} dari 5 Bintang\n`;
          csv += "No,Nama Peserta,Nilai Rating (1-5),Waktu\n";
          p.responses.forEach((r, rIdx) => {
            const rTime = new Date(r.createdAt).toLocaleString("id-ID");
            const rAuthor = r.participantName || "Peserta";
            csv += `${rIdx + 1},"${rAuthor}",${r.ratingValue || 0},"${rTime}"\n`;
          });
        }

        csv += "\n---\n\n";
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${event.code}-Hasil-Polling.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

