"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Users,
  CheckCircle2,
  Percent,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
  BarChart2,
  LayoutGrid,
  Quote,
  Trophy,
  Sparkles
} from "lucide-react";

interface PresentSurveyViewProps {
  surveyId: string;
  stageTheme?: "light" | "dark" | "oled" | "indigo";
}

export default function PresentSurveyView({
  surveyId,
  stageTheme = "light",
}: PresentSurveyViewProps) {
  const [data, setData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"spotlight" | "grid">("spotlight");

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/results`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3000);
    return () => clearInterval(interval);
  }, [surveyId]);

  // Keyboard navigation for spotlight slides (Left/Right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== "spotlight" || !data?.questionAnalytics?.length) return;
      if (e.key === "ArrowLeft") {
        setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentQuestionIndex((prev) =>
          Math.min(data.questionAnalytics.length - 1, prev + 1)
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, data?.questionAnalytics?.length]);

  if (!data?.survey) return null;

  const { survey, stats, questionAnalytics = [] } = data;
  const currentQuestion = questionAnalytics[currentQuestionIndex];

  const isLight = stageTheme === "light";

  // Render Visual Analytics for a Specific Question
  const renderQuestionAnalytics = (q: any, isSpotlight = false) => {
    const analysis = q.analysis || {};
    const totalAnswers = q.totalAnswers || 0;

    return (
      <div className="space-y-4">
        {/* MULTIPLE CHOICE: Horizontal Bar Chart */}
        {q.type === "MULTIPLE_CHOICE" && (() => {
          const options: string[] = analysis.options || [];
          const counts: Record<string, number> = analysis.counts || {};
          const maxCount = Math.max(...Object.values(counts), 1);

          return (
            <div className="space-y-3">
              {options.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Tidak ada opsi pilihan.</p>
              ) : (
                options.map((opt) => {
                  const count = counts[opt] || 0;
                  const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                  const isTop = count > 0 && count === maxCount;

                  return (
                    <div key={opt} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold gap-3">
                        <span className={`truncate flex items-center gap-1.5 ${isLight ? "text-slate-800" : "text-slate-100"}`}>
                          {isTop && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="truncate">{opt}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className={isLight ? "text-slate-500" : "text-slate-400"}>
                            {count} suara
                          </span>
                          <span className={`font-black text-sm ${isTop ? "text-blue-600 font-extrabold" : isLight ? "text-slate-700" : "text-slate-300"}`}>
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Track */}
                      <div className={`h-3.5 sm:h-4 w-full rounded-full overflow-hidden ${isLight ? "bg-slate-100" : "bg-slate-800"}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm"
                              : "bg-blue-500/70"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* RATING: Big Score & Star Distribution */}
        {q.type === "RATING" && (() => {
          const avg = analysis.averageRating || 0;
          const starCounts: Record<number, number> = analysis.starCounts || {};

          return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Big Star Metric */}
              <div className={`md:col-span-5 p-6 rounded-2xl flex flex-col items-center justify-center text-center border ${
                isLight ? "bg-amber-50/60 border-amber-200" : "bg-amber-950/20 border-amber-500/30"
              }`}>
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 sm:w-8 sm:h-8 ${
                        s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-4xl sm:text-5xl font-black font-mono text-amber-500 leading-none my-2">
                  {avg.toFixed(1)}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-amber-800" : "text-amber-300"}`}>
                  Skor Rata-Rata (dari 5.0)
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Berdasarkan {totalAnswers} penilaian
                </span>
              </div>

              {/* 5 to 1 Star Breakdown */}
              <div className="md:col-span-7 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = starCounts[star] || 0;
                  const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;

                  return (
                    <div key={star} className="flex items-center gap-2.5 text-xs font-semibold">
                      <div className="flex items-center gap-1 w-12 shrink-0 font-bold">
                        <span>{star}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>

                      <div className={`flex-1 h-3 rounded-full overflow-hidden ${isLight ? "bg-slate-100" : "bg-slate-800"}`}>
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="w-16 text-right font-mono text-[11px] shrink-0 text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{count}</span> ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* OPEN_TEXT: Interactive Feedback Wall */}
        {q.type === "OPEN_TEXT" && (() => {
          const responses: string[] = analysis.textResponses || [];

          return (
            <div className="space-y-3">
              {responses.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border text-xs font-medium ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-slate-900 border-slate-800 text-slate-500"
                }`}>
                  Belum ada respon teks masuk untuk pertanyaan ini.
                </div>
              ) : (
                <div className={`grid gap-3 ${
                  isSpotlight
                    ? "grid-cols-1 md:grid-cols-2 max-h-[360px] overflow-y-auto pr-1"
                    : "grid-cols-1 max-h-56 overflow-y-auto pr-1"
                }`}>
                  {responses.map((txt, i) => (
                    <div
                      key={i}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition relative overflow-hidden ${
                        isLight
                          ? "bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-white hover:shadow-xs"
                          : "bg-slate-900/80 border-slate-800 text-slate-100 hover:border-slate-700"
                      }`}
                    >
                      <Quote className="w-4 h-4 text-blue-500/40 mb-1" />
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                        "{txt}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* WORD CLOUD */}
        {q.type === "WORD_CLOUD" && (() => {
          const wordFreq: Record<string, number> = analysis.wordFrequency || {};
          const entries = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
          const maxFreq = entries.length > 0 ? entries[0][1] : 1;

          return (
            <div>
              {entries.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada kata kunci masuk.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 py-3 justify-center">
                  {entries.map(([word, freq]) => {
                    const weightRatio = freq / maxFreq;
                    const fontSize = Math.max(12, Math.min(28, 12 + weightRatio * 16));

                    return (
                      <span
                        key={word}
                        style={{ fontSize: `${fontSize}px` }}
                        className={`font-black px-3 py-1 rounded-xl transition ${
                          weightRatio > 0.6
                            ? "bg-blue-600 text-white shadow-xs"
                            : isLight
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-indigo-950/70 text-indigo-300 border border-indigo-700/50"
                        }`}
                      >
                        {word}{" "}
                        <span className="text-[10px] opacity-75 font-mono">({freq})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stage Header & KPI Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <ClipboardList className="w-3.5 h-3.5 fill-current" />
              <span>Survei Pelatihan • Live Analytics</span>
            </span>
            <span
              className={`text-sm font-bold flex items-center gap-1.5 ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>{stats.completedCount} / {stats.totalParticipants} Responden Selesai</span>
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-snug ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {survey.title}
          </h2>
          {survey.description && (
            <p
              className={`text-xs sm:text-sm font-medium max-w-2xl mt-0.5 leading-relaxed ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {survey.description}
            </p>
          )}
        </div>

        {/* View Switcher: Spotlight vs Grid */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl self-start shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("spotlight")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "spotlight"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Mode Sorotan (Slide)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Rekap Semua</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Highlights */}
      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className={`p-3.5 rounded-2xl border ${
          isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-900/80 border-slate-800"
        }`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Partisipan</div>
          <div className={`text-2xl font-black font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
            {stats.totalParticipants}
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-900/80 border-slate-800"
        }`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Selesai</div>
          <div className="text-2xl font-black font-mono text-emerald-500">
            {stats.completedCount}
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-900/80 border-slate-800"
        }`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Completion</div>
          <div className="text-2xl font-black font-mono text-blue-500">
            {stats.completionRate}%
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: SPOTLIGHT / SLIDE MODE (FOKUS 1 PERTANYAAN)      */}
      {/* ========================================================= */}
      {viewMode === "spotlight" && currentQuestion && (
        <div className={`rounded-3xl p-6 sm:p-8 lg:p-10 border shadow-xl relative transition-all ${
          isLight
            ? "bg-white border-slate-200/90 text-slate-900"
            : "bg-slate-900/95 border-indigo-500/30 text-white backdrop-blur-xl"
        }`}>
          {/* Slide Navigation Header */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                #{currentQuestionIndex + 1}
              </span>
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {currentQuestion.type}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-2">
                {currentQuestion.totalAnswers} Responden Telah Menjawab
              </span>
            </div>

            {/* Slide Arrows & Progress Selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Pertanyaan Sebelumnya (Panah Kiri)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-black font-mono px-2 text-slate-500">
                {currentQuestionIndex + 1} / {questionAnalytics.length}
              </span>

              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questionAnalytics.length - 1, prev + 1))}
                disabled={currentQuestionIndex >= questionAnalytics.length - 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Pertanyaan Berikutnya (Panah Kanan)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Spotlight Question Title */}
          <div className="mb-6">
            <h3 className={`text-xl sm:text-2xl lg:text-3xl font-black leading-snug mb-2 ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {currentQuestion.question}
            </h3>
            {currentQuestion.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentQuestion.description}
              </p>
            )}
          </div>

          {/* Spotlight Question Visual Analytics Chart */}
          <div className="pt-2">
            {renderQuestionAnalytics(currentQuestion, true)}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: ALL-IN-ONE GRID MODE (REKAP SELURUH PERTANYAAN)   */}
      {/* ========================================================= */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {questionAnalytics.map((q: any, idx: number) => (
            <div
              key={q.id}
              className={`rounded-3xl p-6 border shadow-sm transition hover:shadow-md ${
                isLight
                  ? "bg-white border-slate-200 text-slate-900"
                  : "bg-slate-900/90 border-slate-800 text-white"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {q.type}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {q.totalAnswers} Jawaban
                </span>
              </div>

              {/* Card Question Title */}
              <h4 className="text-base font-bold mb-4 leading-snug line-clamp-2">
                {q.question}
              </h4>

              {/* Card Analytics */}
              <div>
                {renderQuestionAnalytics(q, false)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
