"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, Send, Heart, Pin, CheckCircle2, AlertCircle, Sparkles, User, Tag } from "lucide-react";
import { IdeasPoll, Idea } from "@/lib/types/interaction";

interface ParticipantIdeasViewProps {
  poll: IdeasPoll;
  voterToken: string;
  participantName: string;
  isAnonymousDefault?: boolean;
}

export default function ParticipantIdeasView({
  poll,
  voterToken,
  participantName,
  isAnonymousDefault = false,
}: ParticipantIdeasViewProps) {
  const [ideas, setIdeas] = useState<Idea[]>(poll.ideas || []);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Umum");
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"popular" | "newest">("popular");

  // Sync ideas from parent prop or periodic fetch
  useEffect(() => {
    setIdeas(poll.ideas || []);
  }, [poll]);

  // Count user ideas
  const userIdeasCount = ideas.filter((i) => i.participantId === voterToken).length;
  const canSubmit = userIdeasCount < poll.maxIdeasPerParticipant;

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    if (!canSubmit) {
      setFeedback({
        type: "error",
        text: `Batas pengiriman ${poll.maxIdeasPerParticipant} ide telah tercapai.`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/ideas-polls/${poll.id}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          participantId: voterToken,
          authorName: participantName,
          category: category.trim() || "Umum",
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", text: data.error || "Gagal mengirim ide" });
        setIsSubmitting(false);
        return;
      }

      setFeedback({ type: "success", text: data.message || "Ide berhasil dikirim!" });
      setContent("");
      if (data.idea) {
        setIdeas((prev) => [data.idea, ...prev]);
      }
    } catch (e) {
      setFeedback({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReaction = async (ideaId: string) => {
    if (!poll.allowReactions) return;

    // Optimistic UI update
    setIdeas((prev) =>
      prev.map((item) => {
        if (item.id === ideaId) {
          const hasReacted = item.reactions?.some((r) => r.participantId === voterToken);
          const newCount = hasReacted ? Math.max(0, item.reactionCount - 1) : item.reactionCount + 1;
          const newReactions = hasReacted
            ? (item.reactions || []).filter((r) => r.participantId !== voterToken)
            : [...(item.reactions || []), { id: "temp", ideaId, participantId: voterToken, reactionType: "UPVOTE", createdAt: new Date().toISOString() }];

          return {
            ...item,
            reactionCount: newCount,
            reactions: newReactions,
          };
        }
        return item;
      })
    );

    try {
      const res = await fetch(`/api/ideas-polls/${poll.id}/ideas/${ideaId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: voterToken,
        }),
      });
      const data = await res.json();
      if (data.success && data.idea) {
        setIdeas((prev) => prev.map((item) => (item.id === ideaId ? data.idea : item)));
      }
    } catch (e) {
      console.error("Reaction failed:", e);
    }
  };

  // Filter ideas visible to participant
  const visibleIdeas = ideas.filter((idea) => {
    // Participant always sees their own ideas
    if (idea.participantId === voterToken) return true;
    // Otherwise only published ideas if poll allows seeing others' ideas
    return poll.allowParticipantsToSeeIdeas && idea.status === "published";
  });

  const sortedIdeas = [...visibleIdeas].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (activeTab === "popular") {
      return b.reactionCount - a.reactionCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Question Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-600" />
            <span>Sesi Gagasan (Ideas)</span>
          </span>
          <span className="text-xs text-slate-400 font-medium">
            • {userIdeasCount}/{poll.maxIdeasPerParticipant} kuota ide
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-1">
          {poll.question}
        </h2>
        {poll.description && (
          <p className="text-xs text-slate-500 leading-relaxed">{poll.description}</p>
        )}
      </div>

      {/* Submission Form Card */}
      {poll.status === "active" ? (
        canSubmit ? (
          <form
            onSubmit={handleSubmitIdea}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Tuliskan Gagasan Anda:</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {content.length}/500
                </span>
              </div>
              <textarea
                rows={3}
                placeholder="Bagikan gagasan, masukan, atau inovasi Anda secara ringkas dan jelas..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                required
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed"
              />
            </div>

            {/* Optional Category & Anonymous Options */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>Kategori:</span>
                </span>
                {["Umum", "Inovasi", "Proses", "Layanan"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      category === cat
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {poll.allowAnonymous && (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-600 rounded-sm"
                  />
                  <span>Kirim Anonim</span>
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirimkan Ide..." : "Kirimkan Gagasan"}</span>
            </button>
          </form>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Anda telah menggunakan seluruh kuota ({poll.maxIdeasPerParticipant} ide) pada sesi ini.</span>
          </div>
        )
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium text-center">
          Sesi pengumpulan ide saat ini sedang tidak menerima masukan baru.
        </div>
      )}

      {/* Feedback Alert */}
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

      {/* Ideas List Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Daftar Gagasan Peserta ({sortedIdeas.length})
          </h3>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab("popular")}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === "popular"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Terpopuler
            </button>
            <button
              onClick={() => setActiveTab("newest")}
              className={`px-2.5 py-1 rounded-md transition ${
                activeTab === "newest"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Terbaru
            </button>
          </div>
        </div>

        {sortedIdeas.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-2xl border border-slate-200">
            <Lightbulb className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Belum ada ide yang terbit</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Jadilah yang pertama mengusulkan gagasan!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedIdeas.map((idea) => {
              const isOwnIdea = idea.participantId === voterToken;
              const hasReacted = (idea.reactions || []).some(
                (r) => r.participantId === voterToken
              );

              return (
                <div
                  key={idea.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition shadow-2xs ${
                    idea.isPinned
                      ? "bg-amber-50/70 border-amber-300"
                      : isOwnIdea
                      ? "bg-blue-50/50 border-blue-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">
                        {idea.authorName || "Anonim"}
                        {isOwnIdea && <span className="text-blue-600 font-bold ml-1">(Ide Anda)</span>}
                      </span>
                      {idea.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          {idea.category}
                        </span>
                      )}
                      {idea.isPinned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          <span>Pinned</span>
                        </span>
                      )}
                      {isOwnIdea && idea.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                          Menunggu Persetujuan
                        </span>
                      )}
                    </div>

                    {/* Reaction Button */}
                    {poll.allowReactions && idea.status === "published" && (
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(idea.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                          hasReacted
                            ? "bg-rose-50 border-rose-300 text-rose-600 ring-1 ring-rose-400/30"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasReacted ? "fill-rose-600 text-rose-600" : ""}`} />
                        <span>{idea.reactionCount}</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                    {idea.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
