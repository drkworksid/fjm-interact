"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, Pin, Heart, Users, Sparkles } from "lucide-react";
import { IdeasPoll, Idea } from "@/lib/types/interaction";

interface PresentIdeasViewProps {
  pollId: string;
  stageTheme?: "light" | "dark" | "oled" | "indigo";
}

export default function PresentIdeasView({
  pollId,
  stageTheme = "light",
}: PresentIdeasViewProps) {
  const [poll, setPoll] = useState<IdeasPoll | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const fetchPoll = async () => {
    try {
      const res = await fetch(`/api/ideas-polls/${pollId}`);
      const data = await res.json();
      if (data.success && data.poll) {
        setPoll(data.poll);
        setIdeas((data.poll.ideas || []).filter((i: Idea) => i.status === "published"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPoll();
    const interval = setInterval(fetchPoll, 3000);
    return () => clearInterval(interval);
  }, [pollId]);

  if (!poll) return null;

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.reactionCount - a.reactionCount;
  });

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <Lightbulb className="w-3.5 h-3.5 fill-current" />
            <span>Sesi Curah Gagasan • Live Ideas</span>
          </span>
          <span
            className={`text-sm font-bold flex items-center gap-1.5 ${
              stageTheme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span>{ideas.length} Gagasan Terkumpul</span>
          </span>
        </div>

        <h2
          className={`text-3xl lg:text-4xl font-black mb-2 leading-snug ${
            stageTheme === "light" ? "text-slate-900" : "text-white"
          }`}
        >
          {poll.question}
        </h2>
        {poll.description && (
          <p
            className={`text-sm lg:text-base font-medium max-w-3xl leading-relaxed ${
              stageTheme === "light" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {poll.description}
          </p>
        )}
      </div>

      {/* Grid of Idea Cards */}
      {sortedIdeas.length === 0 ? (
        <div
          className={`text-center py-20 rounded-3xl border ${
            stageTheme === "light"
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-slate-900/50 border-slate-800"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3
            className={`text-xl font-black mb-1 ${
              stageTheme === "light" ? "text-slate-800" : "text-white"
            }`}
          >
            Menunggu Gagasan dari Peserta...
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gagasan yang dikirimkan peserta dari ponsel mereka akan langsung tampil secara real-time di layar utama ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {sortedIdeas.map((idea, idx) => (
            <div
              key={idea.id}
              className={`p-6 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col justify-between ${
                idea.isPinned
                  ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/30 text-slate-900"
                  : stageTheme === "light"
                  ? "bg-white border-slate-200 text-slate-900 hover:border-amber-400 hover:shadow-md"
                  : stageTheme === "oled"
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 hover:border-zinc-700"
                  : "bg-slate-900/80 border-slate-800 text-slate-100 hover:border-amber-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {idea.authorName || "Anonim"}
                    </span>
                    {idea.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {idea.category}
                      </span>
                    )}
                  </div>

                  {idea.isPinned ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white flex items-center gap-1 shadow-2xs">
                      <Pin className="w-2.5 h-2.5 fill-current" />
                      <span>Pinned</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                  )}
                </div>

                <p className="text-base lg:text-lg font-medium whitespace-pre-wrap break-words leading-relaxed">
                  {idea.content}
                </p>
              </div>

              {poll.allowReactions && (
                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Apresiasi Peserta</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-black">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>{idea.reactionCount}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
