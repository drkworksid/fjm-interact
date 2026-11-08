"use client";

import React, { useState, useEffect } from "react";
import { Award, Users, Trophy } from "lucide-react";
import { RankedOptionResult } from "@/lib/ranking-calculator";

interface PresentRankingViewProps {
  pollId: string;
  stageTheme?: "light" | "dark" | "oled" | "indigo";
}

export default function PresentRankingView({
  pollId,
  stageTheme = "light",
}: PresentRankingViewProps) {
  const [poll, setPoll] = useState<any>(null);
  const [results, setResults] = useState<RankedOptionResult[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);

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
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3000);
    return () => clearInterval(interval);
  }, [pollId]);

  if (!poll) return null;

  const maxAvgScore = results.length > 0 ? Math.max(...results.map((r) => r.averageScore), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <Award className="w-3.5 h-3.5 fill-current" />
            <span>Polling Peringkat • Live Ranking</span>
          </span>
          <span
            className={`text-sm font-bold flex items-center gap-1.5 ${stageTheme === "light" ? "text-slate-500" : "text-slate-400"
              }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>{totalParticipants} Peserta Menilai</span>
          </span>
        </div>

        <h2
          className={`text-3xl lg:text-4xl font-black mb-2 leading-snug ${stageTheme === "light" ? "text-slate-900" : "text-white"
            }`}
        >
          {poll.question}
        </h2>
        {poll.description && (
          <p
            className={`text-sm lg:text-base font-medium max-w-3xl leading-relaxed ${stageTheme === "light" ? "text-slate-500" : "text-slate-400"
              }`}
          >
            {poll.description}
          </p>
        )}
      </div>

      {/* Horizontal Bar Chart of Ranked Results */}
      {totalParticipants === 0 ? (
        <div
          className={`text-center py-20 rounded-3xl border ${stageTheme === "light"
            ? "bg-white border-slate-200 shadow-xs"
            : "bg-slate-900/50 border-slate-800"
            }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Award className="w-8 h-8" />
          </div>
          <h3
            className={`text-xl font-black mb-1 ${stageTheme === "light" ? "text-slate-800" : "text-white"
              }`}
          >
            Menunggu Respon Peringkat dari Peserta...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Urutan opsi dan grafik skor rata-rata akan langsung bergeser secara dinamis begitu suara masuk.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {results.map((item) => {
            const percentage = Math.round((item.averageScore / maxAvgScore) * 100);

            return (
              <div
                key={item.optionId}
                className={`p-4 lg:p-5 rounded-2xl border transition-all duration-500 relative overflow-hidden ${item.rank === 1
                  ? stageTheme === "light"
                    ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20 shadow-md"
                    : "bg-amber-950/30 border-amber-500/40 ring-2 ring-amber-500/20"
                  : stageTheme === "light"
                    ? "bg-white border-slate-200 shadow-xs"
                    : stageTheme === "oled"
                      ? "bg-zinc-950 border-zinc-800"
                      : "bg-slate-900/80 border-slate-800"
                  }`}
              >
                {/* Background Progress Fill */}
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-700 opacity-15 rounded-2xl ${item.rank === 1
                    ? "bg-amber-500"
                    : stageTheme === "light"
                      ? "bg-blue-600"
                      : "bg-indigo-500"
                    }`}
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-xl font-black text-sm lg:text-base flex items-center justify-center shrink-0 shadow-xs ${item.rank === 1
                        ? "bg-amber-400 text-slate-950 shadow-md animate-pulse"
                        : item.rank === 2
                          ? "bg-slate-200 text-slate-800"
                          : item.rank === 3
                            ? "bg-amber-800/20 text-amber-900 dark:text-amber-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                    >
                      {item.rank === 1 ? "👑" : `#${item.rank}`}
                    </span>

                    <span
                      className={`text-lg lg:text-xl font-black truncate ${stageTheme === "light" ? "text-slate-900" : "text-white"
                        }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`text-xs font-semibold ${stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                        }`}
                    >
                      {item.voteCount} suara
                    </span>

                    <div className="flex items-baseline gap-1 bg-white/80 dark:bg-black/40 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Skor</span>
                      <span
                        className={`text-xl lg:text-2xl font-black font-mono ${item.rank === 1
                          ? "text-amber-500"
                          : stageTheme === "light"
                            ? "text-blue-600"
                            : "text-indigo-400"
                          }`}
                      >
                        {item.averageScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
