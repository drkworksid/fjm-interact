"use client";

import React, { useState, useEffect } from "react";
import { Award, Users, Play, Square, Download, Edit2, BarChart3, TrendingUp, Info } from "lucide-react";
import { RankingPoll } from "@/lib/types/interaction";
import { RankedOptionResult } from "@/lib/ranking-calculator";

interface RankingDashboardProps {
  pollId: string;
  eventCode: string;
  onRefresh?: () => void;
  onEdit?: (poll: RankingPoll) => void;
}

export default function RankingDashboard({
  pollId,
  eventCode,
  onRefresh,
  onEdit,
}: RankingDashboardProps) {
  const [poll, setPoll] = useState<RankingPoll | null>(null);
  const [results, setResults] = useState<RankedOptionResult[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/ranking-polls/${pollId}/results`);
      const data = await res.json();
      if (data.success) {
        setPoll(data.poll);
        setResults(data.results || []);
        setTotalParticipants(data.totalParticipants || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3000);
    return () => clearInterval(interval);
  }, [pollId]);

  const handleUpdateStatus = async (newStatus: "active" | "closed") => {
    try {
      const endpoint = newStatus === "active" ? `/api/ranking-polls/${pollId}/start` : `/api/ranking-polls/${pollId}/close`;
      await fetch(endpoint, { method: "POST" });
      fetchResults();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !poll) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-bold">Memuat hasil polling peringkat...</p>
      </div>
    );
  }

  const maxAvgScore = results.length > 0 ? Math.max(...results.map((r) => r.averageScore), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              🏆 Polling Peringkat (Ranking)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                poll.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              Status: {poll.status === "active" ? "Aktif di Layar" : "Non-aktif / Ditutup"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              • {totalParticipants} peserta merespons
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900">{poll.title}</h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">{poll.question}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {poll.status !== "active" ? (
            <button
              onClick={() => handleUpdateStatus("active")}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Aktifkan Polling</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus("closed")}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Tutup Polling</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(poll)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          <a
            href={`/api/ranking-polls/${poll.id}/export`}
            download
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Hasil CSV</span>
          </a>
        </div>
      </div>

      {/* Results Overview (Horizontal Bars) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900">Urutan Hasil Akhir (Positional Average)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Skor rata-rata dihitung dari bobot posisi pilihan setiap peserta (skor tertinggi = prioritas teratas).
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            {totalParticipants} Respon Masuk
          </span>
        </div>

        {totalParticipants === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-600">Belum ada respon yang masuk</p>
            <p className="text-[11px] text-slate-400">Buka polling agar peserta dapat mulai meranking opsi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item) => {
              const percentage = Math.round((item.averageScore / maxAvgScore) * 100);

              return (
                <div key={item.optionId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                          item.rank === 1
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : item.rank === 2
                            ? "bg-slate-200 text-slate-800"
                            : item.rank === 3
                            ? "bg-amber-800/20 text-amber-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{item.rank}
                      </span>
                      <span className="text-slate-800 text-sm font-bold">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.voteCount} suara • total {item.totalScore} poin
                      </span>
                      <span className="font-mono text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Avg: {item.averageScore.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.rank === 1
                          ? "bg-blue-600"
                          : item.rank === 2
                          ? "bg-blue-500"
                          : item.rank === 3
                          ? "bg-indigo-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.max(4, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Position Breakdown Table */}
      {totalParticipants > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>Rincian Distribusi Posisi Ranking</span>
          </h4>

          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2 font-bold">Opsi Pilihan</th>
                {results.map((_, idx) => (
                  <th key={idx} className="pb-2 font-bold text-center">
                    Juara {idx + 1}
                  </th>
                ))}
                <th className="pb-2 font-bold text-right">Skor Rata-rata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((opt) => (
                <tr key={opt.optionId} className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-800">{opt.label}</td>
                  {results.map((_, idx) => {
                    const count = opt.distribution[idx + 1] || 0;
                    return (
                      <td key={idx} className="py-2.5 text-center font-mono">
                        {count > 0 ? (
                          <span className="font-bold text-slate-800">{count}x</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 text-right font-mono font-black text-blue-600">
                    {opt.averageScore.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
