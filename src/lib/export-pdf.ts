import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface QuestionItem {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  status: string;
  createdAt: string;
}

interface PollOptionItem {
  id: string;
  optionText: string;
  isCorrect?: boolean;
  pointValue?: number;
}

interface PollResponseItem {
  id: string;
  optionId?: string | null;
  textResponse?: string | null;
  ratingValue?: number | null;
  participantName?: string | null;
  createdAt: string;
}

interface PollItem {
  id: string;
  title: string;
  type: string;
  hasCorrectAnswer?: boolean;
  options: PollOptionItem[];
  responses: PollResponseItem[];
}

interface EventExportData {
  code: string;
  title: string;
  description?: string | null;
  questions?: QuestionItem[];
  polls?: PollItem[];
}

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "Pilihan Ganda",
  QUIZ: "Kuis Live",
  OPEN_TEXT: "Teks Terbuka",
  WORD_CLOUD: "Word Cloud",
  RATING: "Rating (1-5)",
};

const STATUS_LABELS: Record<string, string> = {
  ANSWERED: "Sudah Terjawab",
  APPROVED: "Disetujui (Belum Terjawab)",
  PENDING: "Menunggu Moderasi",
  ARCHIVED: "Diarsipkan",
};

function drawDocumentHeader(
  doc: jsPDF,
  reportTitle: string,
  eventTitle: string,
  eventCode: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top navy/indigo header bar
  doc.setFillColor(30, 58, 138); // Blue-900
  doc.rect(0, 0, pageWidth, 34, "F");

  // Brand label
  doc.setTextColor(191, 219, 254); // Blue-200
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("PT FIQRY JAYA MANUNGGAL  •  FJM INTERACT", 14, 10);

  // Report title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(reportTitle, 14, 19);

  // Event title & code
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(219, 234, 254);
  const subtitle = `${eventTitle} (#${eventCode})`;
  const truncatedSub = subtitle.length > 85 ? subtitle.slice(0, 82) + "..." : subtitle;
  doc.text(truncatedSub, 14, 27);

  // Export timestamp on right
  const exportDate = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.setFontSize(8);
  doc.setTextColor(191, 219, 254);
  doc.text(`Diekspor: ${exportDate}`, pageWidth - 14, 27, { align: "right" });

  return 42;
}

function addPageFooters(doc: jsPDF, eventCode: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`FJM InterAct — Laporan Sesi #${eventCode}`, 14, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }
}

export function exportQAToPDF(event: EventExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const questions = event.questions || [];
  let cursorY = drawDocumentHeader(
    doc,
    "LAPORAN REKAPITULASI TANYA JAWAB (Q&A)",
    event.title,
    event.code
  );

  // Summary Stats Cards
  const totalQ = questions.length;
  const answeredQ = questions.filter((q) => q.status === "ANSWERED").length;
  const approvedQ = questions.filter((q) => q.status === "APPROVED").length;
  const pendingQ = questions.filter((q) => q.status === "PENDING").length;

  const stats = [
    { label: "Total Pertanyaan", value: String(totalQ) },
    { label: "Sudah Terjawab", value: String(answeredQ) },
    { label: "Aktif / Disetujui", value: String(approvedQ) },
    { label: "Menunggu Moderasi", value: String(pendingQ) },
  ];

  const cardWidth = (doc.internal.pageSize.getWidth() - 28 - 9) / 4;
  stats.forEach((stat, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cursorY, cardWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, x + 3, cursorY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(stat.value, x + 3, cursorY + 12.5);
  });

  cursorY += 23;

  if (questions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Belum ada pertanyaan yang masuk pada sesi ini.", 14, cursorY + 5);
  } else {
    autoTable(doc, {
      startY: cursorY,
      head: [["No", "Waktu", "Penanya", "Pertanyaan", "Upvote", "Status"]],
      body: questions.map((q, idx) => {
        const timeStr = new Date(q.createdAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const author = q.isAnonymous ? "Anonim" : q.authorName || "Peserta";
        const statusText = STATUS_LABELS[q.status] || q.status;
        return [
          String(idx + 1),
          timeStr,
          author,
          q.content,
          String(q.upvotes),
          statusText,
        ];
      }),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        valign: "top",
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 30 },
        3: { cellWidth: "auto" },
        4: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        5: { cellWidth: 28 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const val = String(data.cell.raw || "");
          if (val === "Sudah Terjawab") {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Menunggu Moderasi") {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      },
      margin: { left: 14, right: 14, bottom: 18 },
    });
  }

  addPageFooters(doc, event.code);
  doc.save(`${event.code}-Laporan-QA.pdf`);
}

export function exportPollsToPDF(event: EventExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const polls = event.polls || [];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let cursorY = drawDocumentHeader(
    doc,
    "LAPORAN HASIL POLLING & INTERAKSI",
    event.title,
    event.code
  );

  // Summary Stats
  const totalPolls = polls.length;
  const totalResponses = polls.reduce((sum, p) => sum + (p.responses?.length || 0), 0);

  const summaryStats = [
    { label: "Total Sesi Polling", value: String(totalPolls) },
    { label: "Total Seluruh Suara Masuk", value: String(totalResponses) },
  ];

  const cardWidth = (pageWidth - 28 - 4) / 2;
  summaryStats.forEach((stat, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cursorY, cardWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, x + 4, cursorY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(stat.value, x + 4, cursorY + 12.5);
  });

  cursorY += 24;

  if (polls.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Belum ada polling yang dibuat pada sesi ini.", 14, cursorY + 5);
  }

  polls.forEach((poll, pIdx) => {
    // Page break check before starting a new poll block
    if (cursorY > pageHeight - 55) {
      doc.addPage();
      cursorY = 18;
    }

    const totalVotes = poll.responses?.length || 0;
    const typeLabel = TYPE_LABELS[poll.type] || poll.type;

    // Poll Section Header Card
    const titleLines = doc.splitTextToSize(`${pIdx + 1}. ${poll.title}`, pageWidth - 36);
    const headerHeight = 10 + titleLines.length * 5;

    doc.setFillColor(239, 246, 255); // Blue-50
    doc.setDrawColor(191, 219, 254); // Blue-200
    doc.roundedRect(14, cursorY, pageWidth - 28, headerHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(
      `POLLING #${pIdx + 1}  •  ${typeLabel.toUpperCase()}  •  ${totalVotes} SUARA MASUK`,
      18,
      cursorY + 5.5
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(titleLines, 18, cursorY + 11);

    cursorY += headerHeight + 3;

    // Render content based on poll type
    if (poll.type === "MULTIPLE_CHOICE" || poll.type === "QUIZ") {
      const hasAnswerKey = Boolean(
        poll.hasCorrectAnswer || poll.type === "QUIZ" || poll.options.some((o) => o.isCorrect)
      );

      autoTable(doc, {
        startY: cursorY,
        head: hasAnswerKey
          ? [["No", "Opsi Jawaban", "Keterangan", "Suara", "Persentase"]]
          : [["No", "Opsi Jawaban", "Suara", "Persentase"]],
        body: poll.options.map((opt, oIdx) => {
          const count = poll.responses.filter((r) => r.optionId === opt.id).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          if (hasAnswerKey) {
            const note = opt.isCorrect
              ? `Kunci Benar (+${opt.pointValue || 10} Poin)`
              : "-";
            return [String(oIdx + 1), opt.optionText, note, String(count), `${pct}%`];
          }
          return [String(oIdx + 1), opt.optionText, String(count), `${pct}%`];
        }),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 2.8,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        columnStyles: hasAnswerKey
          ? {
              0: { cellWidth: 10, halign: "center" },
              1: { cellWidth: "auto" },
              2: { cellWidth: 42 },
              3: { cellWidth: 18, halign: "center", fontStyle: "bold" },
              4: { cellWidth: 24, halign: "center", fontStyle: "bold" },
            }
          : {
              0: { cellWidth: 10, halign: "center" },
              1: { cellWidth: "auto" },
              2: { cellWidth: 20, halign: "center", fontStyle: "bold" },
              3: { cellWidth: 26, halign: "center", fontStyle: "bold" },
            },
        didParseCell: (data) => {
          if (hasAnswerKey && data.section === "body") {
            const opt = poll.options[data.row.index];
            if (opt?.isCorrect) {
              data.cell.styles.fillColor = [236, 253, 245]; // Emerald-50
              if (data.column.index === 2) {
                data.cell.styles.textColor = [5, 150, 105];
                data.cell.styles.fontStyle = "bold";
              }
            }
          }
        },
        margin: { left: 14, right: 14, bottom: 18 },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 9;
    } else if (poll.type === "OPEN_TEXT") {
      if (poll.responses.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Belum ada tanggapan teks yang masuk.", 18, cursorY + 4);
        cursorY += 12;
      } else {
        autoTable(doc, {
          startY: cursorY,
          head: [["No", "Nama Peserta", "Tanggapan / Jawaban", "Waktu"]],
          body: poll.responses.map((r, rIdx) => {
            const rTime = new Date(r.createdAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return [
              String(rIdx + 1),
              r.participantName || "Peserta",
              (r.textResponse || "").trim(),
              rTime,
            ];
          }),
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 3,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            valign: "top",
          },
          headStyles: {
            fillColor: [51, 65, 85],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 36, fontStyle: "bold" },
            2: { cellWidth: "auto" },
            3: { cellWidth: 16, halign: "center" },
          },
          margin: { left: 14, right: 14, bottom: 18 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 9;
      }
    } else if (poll.type === "WORD_CLOUD") {
      if (poll.responses.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Belum ada kata yang masuk.", 18, cursorY + 4);
        cursorY += 12;
      } else {
        // Group word frequency
        const freqMap: Record<string, number> = {};
        poll.responses.forEach((r) => {
          const word = (r.textResponse || "").trim();
          if (word) {
            const key = word.toLowerCase();
            freqMap[key] = (freqMap[key] || 0) + 1;
          }
        });
        const sortedWords = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);

        autoTable(doc, {
          startY: cursorY,
          head: [["No", "Kata / Frasa", "Frekuensi", "Persentase"]],
          body: sortedWords.map(([word, count], wIdx) => {
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return [String(wIdx + 1), word, `${count}x`, `${pct}%`];
          }),
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 2.5,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [51, 65, 85],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: "auto", fontStyle: "bold" },
            2: { cellWidth: 24, halign: "center" },
            3: { cellWidth: 24, halign: "center" },
          },
          margin: { left: 14, right: 14, bottom: 18 },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 9;
      }
    } else if (poll.type === "RATING") {
      const avg =
        totalVotes > 0
          ? (
              poll.responses.reduce((acc, r) => acc + (r.ratingValue || 0), 0) / totalVotes
            ).toFixed(2)
          : "0.00";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(217, 119, 6); // Amber-600
      doc.text(
        `Skor Rata-Rata: ${avg} / 5.00 Bintang  (dari ${totalVotes} responden)`,
        16,
        cursorY + 3.5
      );
      cursorY += 7;

      const starRows = [5, 4, 3, 2, 1].map((star) => {
        const count = poll.responses.filter((r) => r.ratingValue === star).length;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return [`${star} Bintang`, String(count), `${pct}%`];
      });

      autoTable(doc, {
        startY: cursorY,
        head: [["Skala Rating", "Jumlah Pemilih", "Persentase"]],
        body: starRows,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: "bold" },
          1: { cellWidth: "auto", halign: "center" },
          2: { cellWidth: 35, halign: "center", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14, bottom: 18 },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 9;
    }
  });

  addPageFooters(doc, event.code);
  doc.save(`${event.code}-Laporan-Polling.pdf`);
}
