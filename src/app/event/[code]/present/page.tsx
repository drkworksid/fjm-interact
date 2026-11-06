"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import {
  MessageSquare,
  BarChart2,
  ThumbsUp,
  Maximize2,
  Minimize2,
  Sparkles,
  QrCode,
  Users,
  CheckCircle2,
  Star
} from "lucide-react";
import Link from "next/link";

interface Question {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  status: string;
  createdAt: string;
}

interface PollOption {
  id: string;
  optionText: string;
  orderIndex: number;
  _count?: { responses: number };
}

interface PollResponse {
  id: string;
  optionId?: string | null;
  textResponse?: string | null;
  ratingValue?: number | null;
  participantToken: string;
  participantName?: string | null;
}

interface Poll {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  showResults: boolean;
  options: PollOption[];
  responses: PollResponse[];
}

interface EventData {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  highlightedQuestionId: string | null;
}

export default function PresenterPage() {
  const params = useParams();
  const eventCode = (params.code as string)?.toUpperCase();

  const [event, setEvent] = useState<EventData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [joinUrl, setJoinUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Event Data & QR
  const fetchEventData = async () => {
    try {
      const [resEvent, resQr] = await Promise.all([
        fetch(`/api/events/${eventCode}`),
        fetch(`/api/events/${eventCode}/qr`),
      ]);
      const dataEvent = await resEvent.json();
      const dataQr = await resQr.json();

      if (dataEvent.success) {
        setEvent(dataEvent.event);
        setQuestions(dataEvent.event.questions || []);
        setPolls(dataEvent.event.polls || []);
      }
      if (dataQr.success) {
        setQrDataUrl(dataQr.qrDataUrl);
        setJoinUrl(dataQr.joinUrl);
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!eventCode) return;
    fetchEventData();

    const socket = getSocket();

    const onConnect = () => {
      socket.emit("join_event", eventCode);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    socket.on("question:created", (newQuestion: Question) => {
      setQuestions((prev) => {
        const exists = prev.some((q) => q.id === newQuestion.id);
        if (exists) return prev;
        return [newQuestion, ...prev];
      });
    });

    socket.on("question:voted", (payload: { questionId: string; upvotes: number; question?: Question }) => {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === payload.questionId) {
            return { ...q, upvotes: payload.upvotes };
          }
          return q;
        })
      );
    });

    socket.on("question:status_updated", (updated: Question) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q))
      );
    });

    socket.on("question:deleted", ({ questionId }: { questionId: string }) => {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    });

    socket.on("event:highlighted", ({ questionId }: { questionId: string | null }) => {
      setEvent((prev) => (prev ? { ...prev, highlightedQuestionId: questionId } : null));
    });

    socket.on("event:updated", (updatedEvent: EventData) => {
      setEvent((prev) => (prev ? { ...prev, ...updatedEvent } : null));
    });

    socket.on("poll:status_updated", (updatedPoll: Poll) => {
      setPolls((prev) => {
        const exists = prev.some((p) => p.id === updatedPoll.id);
        if (!exists) return [...prev, updatedPoll];
        return prev.map((p) => {
          if (p.id === updatedPoll.id) return updatedPoll;
          if (updatedPoll.isActive) return { ...p, isActive: false };
          return p;
        });
      });
    });

    socket.on("poll:voted", (updatedPoll: Poll) => {
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    return () => {
      socket.emit("leave_event", eventCode);
      socket.off("connect", onConnect);
      socket.off("question:created");
      socket.off("question:voted");
      socket.off("question:status_updated");
      socket.off("question:deleted");
      socket.off("event:highlighted");
      socket.off("event:updated");
      socket.off("poll:status_updated");
      socket.off("poll:voted");
    };
  }, [eventCode]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Menyiapkan Layar Presenter #{eventCode}...</h2>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold">Event #{eventCode} tidak ditemukan</h2>
      </div>
    );
  }

  const activePoll = polls.find((p) => p.isActive);
  const highlightedQuestion = questions.find((q) => q.id === event.highlightedQuestionId);

  // Filter approved questions for stage view
  const approvedQuestions = questions.filter(
    (q) => q.status === "APPROVED" || q.status === "HIGHLIGHTED" || q.status === "ANSWERED"
  );
  const sortedQuestions = [...approvedQuestions].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none">
      {/* Top Bar for Presenter Mode */}
      <header className="flex items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
            Layar Proyektor • Live
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white mt-2 tracking-tight">
            {event.title}
          </h1>
        </div>

        {/* Join Prompt & QR Box on Stage */}
        <div className="flex items-center gap-4 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3 shadow-xl backdrop-blur-md">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white p-1"
            />
          )}
          <div className="text-left pr-2">
            <p className="text-xs text-indigo-300 font-medium">Pindai QR atau buka tautan:</p>
            <p className="text-sm lg:text-base font-bold text-white tracking-wide">
              {joinUrl ? joinUrl.replace(/^https?:\/\//, "") : `/#${event.code}`}
            </p>
            <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
              Kode: <span className="text-white text-base">#{event.code}</span>
            </p>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 my-8 flex flex-col justify-center max-w-6xl mx-auto w-full">
        {/* SCENARIO 1: A Question is Spotlighted / Highlighted by Trainer */}
        {highlightedQuestion ? (
          <div className="bg-gradient-to-br from-indigo-900/70 to-slate-900/90 border-2 border-emerald-400/80 rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>SEDANG DIBAHAS DI PANGGUNG</span>
              </div>

              <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 px-4 py-2 rounded-2xl text-white font-bold text-lg">
                <ThumbsUp className="w-5 h-5 text-indigo-400 stroke-[2.5]" />
                <span>{highlightedQuestion.upvotes} Suara</span>
              </div>
            </div>

            <p className="text-3xl lg:text-5xl font-extrabold text-white leading-tight mb-8">
              "{highlightedQuestion.content}"
            </p>

            <div className="flex items-center gap-3 text-base lg:text-lg text-indigo-200 font-medium">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span>
                Diajukan oleh:{" "}
                <strong className="text-white">
                  {highlightedQuestion.isAnonymous ? "Peserta Anonim" : highlightedQuestion.authorName}
                </strong>
              </span>
            </div>
          </div>
        ) : activePoll ? (
          /* SCENARIO 2: A Poll is Active */
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                Live Polling: {activePoll.type.replace("_", " ")}
              </span>
              <span className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{activePoll.responses?.length || 0} Respons Masuk</span>
              </span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-8 leading-snug">
              {activePoll.title}
            </h2>

            {/* Multiple Choice Chart */}
            {activePoll.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-4">
                {(() => {
                  const total = activePoll.responses?.length || 0;
                  return activePoll.options.map((opt, idx) => {
                    const optVotes =
                      activePoll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                    const percent = total > 0 ? Math.round((optVotes / total) * 100) : 0;

                    return (
                      <div key={opt.id} className="relative">
                        <div className="h-16 lg:h-20 bg-slate-800/80 rounded-2xl overflow-hidden relative border border-slate-700/60 flex items-center px-6">
                          {/* Animated progress fill */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-700 rounded-2xl"
                            style={{ width: `${percent}%` }}
                          />

                          <div className="relative z-10 w-full flex items-center justify-between">
                            <span className="text-lg lg:text-xl font-bold text-white drop-shadow">
                              {opt.optionText}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-indigo-200/80 font-medium">
                                {optVotes} suara
                              </span>
                              <span className="text-2xl lg:text-3xl font-black text-white font-mono">
                                {percent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Word Cloud View */}
            {activePoll.type === "WORD_CLOUD" && (
              <div className="min-h-[300px] flex items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800">
                {(() => {
                  // Calculate word frequencies
                  const freqMap: Record<string, number> = {};
                  (activePoll.responses || []).forEach((r) => {
                    const word = (r.textResponse || "").trim().toLowerCase();
                    if (word) {
                      freqMap[word] = (freqMap[word] || 0) + 1;
                    }
                  });

                  const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
                  const maxFreq = entries[0]?.[1] || 1;

                  if (entries.length === 0) {
                    return (
                      <p className="text-slate-500 text-lg">
                        Menunggu peserta memasukkan kata kunci...
                      </p>
                    );
                  }

                  const colors = [
                    "text-indigo-400",
                    "text-emerald-400",
                    "text-amber-300",
                    "text-sky-300",
                    "text-rose-400",
                    "text-teal-300",
                  ];

                  return (
                    <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 p-4">
                      {entries.map(([word, count], i) => {
                        const scale = 1 + (count / maxFreq) * 2; // scale from 1 to 3
                        const fontSize = `${Math.min(48, Math.max(18, 18 * scale))}px`;
                        const colorClass = colors[i % colors.length];

                        return (
                          <span
                            key={word}
                            style={{ fontSize }}
                            className={`font-black tracking-wide ${colorClass} transition-all duration-300 hover:scale-110 drop-shadow-md`}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Rating Average View */}
            {activePoll.type === "RATING" && (
              <div className="text-center py-8">
                {(() => {
                  const responses = activePoll.responses || [];
                  const total = responses.length;
                  const avg =
                    total > 0
                      ? (
                          responses.reduce((acc, r) => acc + (r.ratingValue || 0), 0) / total
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <div className="flex flex-col items-center">
                      <div className="text-6xl lg:text-8xl font-black text-amber-400 font-mono mb-2">
                        {avg}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-8 h-8 ${
                              parseFloat(avg) >= s
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-slate-400 text-base">
                        Berdasarkan {total} suara peserta
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          /* SCENARIO 3: Default Q&A Questions Board */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-indigo-400" />
                <span>Pertanyaan Audiens Teratas</span>
              </h2>
              <span className="text-sm text-slate-400 font-medium">
                {sortedQuestions.length} Total Pertanyaan
              </span>
            </div>

            {sortedQuestions.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl">
                <p className="text-xl text-slate-400 font-medium mb-2">
                  Belum ada pertanyaan dari audiens.
                </p>
                <p className="text-sm text-slate-500">
                  Scan QR code di pojok kanan atas untuk mengajukan pertanyaan pertama!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedQuestions.slice(0, 6).map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition shadow-lg flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {q.isAnonymous ? "Anonim" : q.authorName}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-white leading-relaxed line-clamp-3">
                        {q.content}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center min-w-[54px] px-3 py-3 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-white shrink-0">
                      <ThumbsUp className="w-5 h-5 text-indigo-400 mb-1" />
                      <span className="text-base font-black font-mono">{q.upvotes}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Slido Training • Live Sync On</span>
        </div>
        <Link
          href={`/event/${event.code}/moderate`}
          target="_blank"
          className="text-indigo-400 hover:text-indigo-300 underline font-medium"
        >
          Buka Panel Kontrol Trainer (Tab Terpisah)
        </Link>
      </footer>
    </div>
  );
}

