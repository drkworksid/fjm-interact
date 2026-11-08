import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const poll = await prisma.ideasPoll.findUnique({
      where: { id },
      include: {
        event: { select: { code: true, title: true } },
        ideas: {
          orderBy: [{ isPinned: "desc" }, { reactionCount: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: "Ideas Poll tidak ditemukan" }, { status: 404 });
    }

    // Generate CSV
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = ["No", "Penulis", "Kategori", "Isi Gagasan", "Jumlah Reaksi", "Disematkan", "Status", "Waktu Dibuat"];
    const rows = poll.ideas.map((idea, idx) => [
      idx + 1,
      escapeCsv(idea.authorName || "Anonim"),
      escapeCsv(idea.category || "Umum"),
      escapeCsv(idea.content),
      idea.reactionCount,
      idea.isPinned ? "Ya" : "Tidak",
      idea.status,
      escapeCsv(new Date(idea.createdAt).toLocaleString("id-ID")),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const filename = `ideas-${poll.event?.code || "event"}-${Date.now()}.csv`;

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

