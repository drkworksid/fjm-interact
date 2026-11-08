"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Users, CheckCircle2, Percent, Clock } from "lucide-react";

interface PresentSurveyViewProps {
  surveyId: string;
  stageTheme?: "light" | "dark" | "oled" | "indigo";
}

export default function PresentSurveyView({
  surveyId,
  stageTheme = "light",
}: PresentSurveyViewProps) {
  const [data, setData] = useState<any>(null);

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

  if (!data?.survey) return null;

  const { survey, stats, questionAnalytics = [] } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <ClipboardList className="w-3.5 h-3.5 fill-current" />
            <span>Survei Pelatihan • Live Survey</span>
          </span>
          <span
            className={`text-sm font-bold flex items-center gap-1.5 ${
              stageTheme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>{stats.completedCount} / {stats.totalParticipants} Peserta Menyelesaikan</span>
          </span>
        </div>

        <h2
          className={`text-3xl lg:text-4xl font-black mb-2 leading-snug ${
            stageTheme === "light" ? "text-slate-900" : "text-white"
          }`}
        >
          {survey.title}
        </h2>
        {survey.description && (
          <p
            className={`text-sm lg:text-base font-medium max-w-3xl leading-relaxed ${
              stageTheme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {survey.description}
          </p>
        )}
      </div>

      {/* Big Stage KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <div
          className={`p-5 rounded-2xl border ${
            stageTheme === "light"
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-slate-900/80 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Partisipan Masuk</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div
            className={`text-3xl font-black font-mono ${
              stageTheme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            {stats.totalParticipants}
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            stageTheme === "light"
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-slate-900/80 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Survei Terisi Lengkap</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-500">
            {stats.completedCount}
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            stageTheme === "light"
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-slate-900/80 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
            <span>Tingkat Penyelesaian</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black font-mono text-blue-500">
            {stats.completionRate}%
          </div>
        </div>
      </div>

      {/* Questions Summary List */}
      <div className="space-y-3 max-w-4xl">
        <h3
          className={`text-sm font-black uppercase tracking-wider ${
            stageTheme === "light" ? "text-slate-700" : "text-slate-300"
          }`}
        >
          Daftar Pertanyaan Survei ({questionAnalytics.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {questionAnalytics.map((q: any, idx: number) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl border ${
                stageTheme === "light"
                  ? "bg-white border-slate-200 shadow-2xs"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {q.type}
                </span>
                <span className="text-[11px] font-bold text-slate-400 ml-auto">
                  {q.totalAnswers} Jawaban
                </span>
              </div>

              <p
                className={`text-sm font-bold truncate ${
                  stageTheme === "light" ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {q.question}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
