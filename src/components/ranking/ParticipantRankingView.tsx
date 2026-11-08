"use client";

import React, { useState, useEffect } from "react";
import { Award, ArrowUp, ArrowDown, GripVertical, CheckCircle2, Lock, Send, AlertCircle, BarChart2 } from "lucide-react";
import { RankingPoll, RankingOption } from "@/lib/types/interaction";

interface ParticipantRankingViewProps {
  poll: RankingPoll;
  voterToken: string;
  participantName: string;
  isAnonymousDefault?: boolean;
}

export default function ParticipantRankingView({
  poll,
  voterToken,
  participantName,
  isAnonymousDefault = false,
}: ParticipantRankingViewProps) {
  // Check if participant already voted
  const userResponse = (poll.responses || []).find((r) => r.participantId === voterToken);
  const hasVoted = Boolean(userResponse);

  // Initial options ordering (randomize if poll.randomizeOptions and not yet voted)
  const [orderedOptions, setOrderedOptions] = useState<RankingOption[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);

  useEffect(() => {
    let opts = [...(poll.options || [])];
    if (poll.randomizeOptions && !hasVoted) {
      // Deterministic or pseudorandom shuffle for this voter
      opts.sort(() => Math.random() - 0.5);
    }
    setOrderedOptions(opts);
  }, [poll.id, hasVoted]);

  const handleMove = (index: number, direction: "up" | "down") => {
    if (hasVoted) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= orderedOptions.length) return;

    const copy = [...orderedOptions];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setOrderedOptions(copy);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (hasVoted) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (hasVoted || draggedIndex === null || draggedIndex === index) return;

    const copy = [...orderedOptions];
    const draggedItem = copy[draggedIndex];
    copy.splice(draggedIndex, 1);
    copy.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setOrderedOptions(copy);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasVoted || isSubmitting) return;

    if (orderedOptions.length < poll.minRankItems) {
      setFeedback({
        type: "error",
        text: `Harap urutkan minimal ${poll.minRankItems} pilihan.`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/ranking-polls/${poll.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: voterToken,
          participantName,
          rankedOptionIds: orderedOptions.map((o) => o.id),
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", text: data.error || "Gagal mengirimkan ranking" });
        setIsSubmitting(false);
        return;
      }

      setFeedback({ type: "success", text: "Respon ranking berhasil disimpan dan dikunci!" });
    } catch (e) {
      setFeedback({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Question */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Award className="w-3 h-3 text-blue-600" />
            <span>Polling Peringkat</span>
          </span>
          <span className="text-xs text-slate-400 font-medium">
            • {poll.responses?.length || 0} suara masuk
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-1">
          {poll.question}
        </h2>
        {poll.description ? (
          <p className="text-xs text-slate-500 leading-relaxed mb-2">{poll.description}</p>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed mb-2">
            Geser kartu atau tekan tombol panah untuk menyusun urutan dari prioritas tertinggi (#1) ke terendah.
          </p>
        )}

        {hasVoted ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Respon peringkat Anda telah tersimpan</span>
            </div>
            <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-black">
              Terkunci 🔒
            </span>
          </div>
        ) : (
          poll.status !== "active" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2 mt-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Polling saat ini tidak aktif atau telah ditutup oleh trainer.</span>
            </div>
          )
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Ranked Items List */}
      <div className="space-y-2">
        {orderedOptions.map((opt, idx) => {
          const rank = idx + 1;
          const isTop = rank === 1;

          return (
            <div
              key={opt.id}
              draggable={!hasVoted && poll.status === "active"}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 select-none ${
                hasVoted
                  ? "bg-slate-50 border-slate-200 opacity-90"
                  : isTop
                  ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Drag Handle Icon for Desktop/Pointer */}
                {!hasVoted && poll.status === "active" && (
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}

                {/* Rank Number Badge */}
                <div
                  className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    isTop
                      ? "bg-blue-600 text-white shadow-xs"
                      : rank === 2
                      ? "bg-slate-200 text-slate-800"
                      : rank === 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  #{rank}
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {opt.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Accessible Reorder Arrows (Touch & Keyboard Friendly) */}
              {!hasVoted && poll.status === "active" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Naikkan urutan ${opt.label}`}
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Turunkan urutan ${opt.label}`}
                    onClick={() => handleMove(idx, "down")}
                    disabled={idx === orderedOptions.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50 transition"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submission Footer */}
      {!hasVoted && poll.status === "active" && (
        <div className="pt-2">
          {poll.allowAnonymous && (
            <label className="flex items-center gap-2 mb-3 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>Kirimkan urutan peringkat secara anonim</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? "Mengirimkan Ranking..." : "Kirim Jawaban Peringkat"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
