"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Users,
  CheckCircle2,
  Clock,
  Percent,
  Play,
  Square,
  Download,
  Edit2,
  Star,
  MessageSquare,
  BarChart2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Survey } from "@/lib/types/interaction";

interface SurveyDashboardProps {
  surveyId: string;
  eventCode: string;
  onRefresh?: () => void;
  onEdit?: (survey: Survey) => void;
}

export default function SurveyDashboard({
  surveyId,
  eventCode,
  onRefresh,
  onEdit,
}: SurveyDashboardProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/results`);
      const data = await res.json();
      if (data.success) {
        setSurvey(data.survey);
        setStats(data.stats);
        setQuestionAnalytics(data.questionAnalytics || []);
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
  }, [surveyId]);

  const handleUpdateStatus = async (newStatus: "active" | "closed") => {
    try {
      const endpoint = newStatus === "active" ? `/api/surveys/${surveyId}/start` : `/api/surveys/${surveyId}/close`;
      await fetch(endpoint, { method: "POST" });
      fetchResults();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !survey || !stats) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-bold">Memuat analitik survei...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
              📋 Survei Multi-Pertanyaan
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                survey.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              Status: {survey.status === "active" ? "Aktif" : "Non-aktif / Ditutup"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              • {stats.completedCount} survei selesai
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900">{survey.title}</h2>
          {survey.description && (
            <p className="text-xs text-slate-600 mt-0.5 font-medium">{survey.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {survey.status !== "active" ? (
            <button
              onClick={() => handleUpdateStatus("active")}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Aktifkan Survei</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus("closed")}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Tutup Survei</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(survey)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          <a
            href={`/api/surveys/${survey.id}/export`}
            download
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Hasil CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Total Partisipan</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalParticipants}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Memulai survei</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Survei Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.completedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Jawaban lengkap terkirim</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Completion Rate</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.completionRate}%</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tingkat penyelesaian</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Rata-rata Waktu</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.avgDurationSeconds > 60
              ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${stats.avgDurationSeconds % 60}s`
              : `${stats.avgDurationSeconds}s`}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Durasi pengerjaan</p>
        </div>
      </div>

      {/* Breakdown per Question */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          Analisis Hasil Per Pertanyaan ({questionAnalytics.length})
        </h3>

        {questionAnalytics.map((q, idx) => (
          <div key={q.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {q.type}
                  </span>
                  {q.required && (
                    <span className="text-[10px] text-red-500 font-bold">* Wajib</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{q.question}</h4>
                {q.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                )}
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                {q.totalAnswers} Jawaban
              </span>
            </div>

            {/* Multiple Choice Chart */}
            {q.type === "MULTIPLE_CHOICE" && q.analysis?.options && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {q.analysis.options.map((opt: string) => {
                  const count = q.analysis.counts[opt] || 0;
                  const pct = q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0;

                  return (
                    <div key={opt} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{opt}</span>
                        <span>{count} suara ({pct}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rating Breakdown */}
            {q.type === "RATING" && q.analysis && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-black font-mono text-amber-500">
                    {q.analysis.averageRating?.toFixed(1) || "0.0"}
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          (q.analysis.averageRating || 0) >= s
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Skor Rata-rata</p>
                </div>

                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = q.analysis.starCounts?.[star] || 0;
                    const pct = q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-8 font-bold text-slate-500">{star} ★</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right font-mono text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Open Text Responses */}
            {q.type === "OPEN_TEXT" && q.analysis?.textResponses && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
                {q.analysis.textResponses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada jawaban teks.</p>
                ) : (
                  q.analysis.textResponses.map((text: string, tIdx: number) => (
                    <div key={tIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed">
                      {text}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Word Cloud Frequency */}
            {q.type === "WORD_CLOUD" && q.analysis?.wordFrequency && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {Object.entries(q.analysis.wordFrequency).map(([word, count]: any) => (
                  <span
                    key={word}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700"
                  >
                    {word} <span className="text-[10px] opacity-75">({count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
