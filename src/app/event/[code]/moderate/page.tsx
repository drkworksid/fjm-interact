"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import {
  MessageSquare,
  BarChart2,
  ThumbsUp,
  Sparkles,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  Plus,
  Play,
  Square,
  Eye,
  EyeOff,
  ExternalLink,
  Settings,
  ShieldAlert,
  QrCode,
  Download,
  Flame,
  Clock,
  Check
} from "lucide-react";
import Link from "next/link";

interface Question {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  status: string; // PENDING, APPROVED, ANSWERED, ARCHIVED
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
  isModerationEnabled: boolean;
  isAnonymousAllowed: boolean;
  status: string;
  highlightedQuestionId: string | null;
}

export default function ModeratorPage() {
  const params = useParams();
  const router = useRouter();
  const eventCode = (params.code as string)?.toUpperCase();

  const [event, setEvent] = useState<EventData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [joinUrl, setJoinUrl] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"qa" | "polls" | "settings">("qa");
  const [qaFilter, setQaFilter] = useState<"all" | "pending" | "approved" | "answered">("all");
  const [isLoading, setIsLoading] = useState(true);

  // New Poll Modal Form
  const [isNewPollModalOpen, setIsNewPollModalOpen] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollType, setNewPollType] = useState<"MULTIPLE_CHOICE" | "WORD_CLOUD" | "RATING">("MULTIPLE_CHOICE");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["Opsi 1", "Opsi 2"]);

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

  // Actions for Questions
  const handleUpdateQuestionStatus = async (questionId: string, status: string) => {
    try {
      await fetch(`/api/events/${eventCode}/questions/${questionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHighlight = async (questionId: string) => {
    const isCurrentlyHighlighted = event?.highlightedQuestionId === questionId;
    try {
      await fetch(`/api/events/${eventCode}/questions/${questionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHighlighted: !isCurrentlyHighlighted }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Hapus pertanyaan ini secara permanen?")) return;
    try {
      await fetch(`/api/events/${eventCode}/questions/${questionId}/status`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Actions for Polls
  const handleTogglePollActive = async (pollId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePollResults = async (pollId: string, currentShow: boolean) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showResults: !currentShow }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Hapus polling ini beserta semua suaranya?")) return;
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollTitle.trim()) return;

    try {
      const res = await fetch(`/api/events/${eventCode}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPollTitle.trim(),
          type: newPollType,
          options: newPollType === "MULTIPLE_CHOICE" ? newPollOptions.filter((o) => o.trim()) : [],
          isActive: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewPollModalOpen(false);
        setNewPollTitle("");
        setNewPollOptions(["Opsi 1", "Opsi 2"]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Moderation Mode
  const handleToggleModeration = async () => {
    if (!event) return;
    const newStatus = !event.isModerationEnabled;
    try {
      await fetch(`/api/events/${eventCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isModerationEnabled: newStatus }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Memuat Panel Kontrol Trainer...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Event Tidak Ditemukan</h2>
        <Link href="/dashboard" className="text-indigo-400 hover:underline text-sm">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  // Filtered Questions
  const pendingQuestions = questions.filter((q) => q.status === "PENDING");
  const filteredQuestions = questions.filter((q) => {
    if (qaFilter === "pending") return q.status === "PENDING";
    if (qaFilter === "approved") return q.status === "APPROVED" || q.status === "HIGHLIGHTED";
    if (qaFilter === "answered") return q.status === "ANSWERED";
    return true; // "all"
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar Trainer Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/60"
          >
            ← Dashboard
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                #{event.code}
              </span>
              <h1 className="font-bold text-base text-white">{event.title}</h1>
              <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded ml-1">
                FJM InterAct
              </span>
            </div>
            <p className="text-xs text-slate-400">PT Fiqry Jaya Manunggal • Panel Moderasi Sesi</p>
          </div>
        </div>

        {/* Action Buttons for Stage, Participant views, & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Dropdown / Buttons */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5 text-xs">
            <a
              href={`/api/events/${event.code}/export?type=qa`}
              download
              className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg flex items-center gap-1 font-medium transition"
              title="Unduh seluruh daftar pertanyaan & upvotes ke format Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor Q&A</span>
            </a>
            <span className="text-slate-600">|</span>
            <a
              href={`/api/events/${event.code}/export?type=polls`}
              download
              className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg flex items-center gap-1 font-medium transition"
              title="Unduh seluruh hasil rekap polling ke format Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ekspor Polling</span>
            </a>
          </div>

          <Link
            href={`/event/${event.code}/present`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Layar Proyektor</span>
          </Link>
          <Link
            href={`/${event.code}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <span>Tampilan Peserta (HP)</span>
          </Link>
        </div>
      </header>

      {/* Secondary Bar: Moderation Switch & Status */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("qa")}
            className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition ${
              activeTab === "qa"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Audience Q&A</span>
            {pendingQuestions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                {pendingQuestions.length} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("polls")}
            className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition ${
              activeTab === "polls"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Live Polling & Kuis</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold text-[10px]">
              {polls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition ${
              activeTab === "settings"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan & QR Code</span>
          </button>
        </div>

        {/* Moderation Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={event.isModerationEnabled}
              onChange={handleToggleModeration}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400"
            />
            <span className="text-xs font-semibold text-slate-300">
              Moderasi Pertanyaan:{" "}
              <strong className={event.isModerationEnabled ? "text-amber-400" : "text-slate-400"}>
                {event.isModerationEnabled ? "Aktif (Review Dulu)" : "Langsung Tampil"}
              </strong>
            </span>
          </label>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* TAB 1: AUDIENCE Q&A MODERATION */}
        {activeTab === "qa" && (
          <div>
            {/* Filter buttons */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setQaFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    qaFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua ({questions.length})
                </button>
                <button
                  onClick={() => setQaFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    qaFilter === "pending"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Perlu Review ({pendingQuestions.length})
                </button>
                <button
                  onClick={() => setQaFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    qaFilter === "approved" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tampil ({questions.filter((q) => q.status === "APPROVED" || q.status === "HIGHLIGHTED").length})
                </button>
                <button
                  onClick={() => setQaFilter("answered")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    qaFilter === "answered" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Terjawab ({questions.filter((q) => q.status === "ANSWERED").length})
                </button>
              </div>

              {event.highlightedQuestionId && (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-xl text-emerald-300 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ada 1 pertanyaan sedang disorot di proyektor</span>
                  <button
                    onClick={() => handleToggleHighlight(event.highlightedQuestionId!)}
                    className="text-white hover:underline text-[11px] font-bold ml-1"
                  >
                    (Lepas Sorotan)
                  </button>
                </div>
              )}
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">Tidak ada pertanyaan pada filter ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q) => {
                  const isHighlighted = q.id === event.highlightedQuestionId;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition ${
                        isHighlighted
                          ? "bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-lg"
                          : q.status === "PENDING"
                          ? "bg-amber-950/20 border-amber-500/40"
                          : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-xs text-white">
                              {q.isAnonymous ? "Anonim" : q.authorName}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">
                              {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Status Badges */}
                            {q.status === "PENDING" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Perlu Review
                              </span>
                            )}
                            {q.status === "ANSWERED" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                                Selesai Terjawab
                              </span>
                            )}
                            {isHighlighted && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                Sedang di Proyektor
                              </span>
                            )}
                          </div>

                          <p className="text-base text-white font-medium mb-3 leading-relaxed">
                            {q.content}
                          </p>

                          {/* Upvotes Counter */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-bold text-white">{q.upvotes}</span>
                            <span>upvotes dari peserta</span>
                          </div>
                        </div>

                        {/* Action Controls for Trainer */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-xs">
                          {q.status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleUpdateQuestionStatus(q.id, "APPROVED")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Highlight to Big Screen Toggle */}
                              <button
                                onClick={() => handleToggleHighlight(q.id)}
                                className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${
                                  isHighlighted
                                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                }`}
                              >
                                <Sparkles className={`w-3.5 h-3.5 ${isHighlighted ? "text-slate-950" : "text-amber-400"}`} />
                                <span>{isHighlighted ? "Lepas Sorot" : "Sorot ke Layar"}</span>
                              </button>

                              {/* Mark Answered */}
                              {q.status !== "ANSWERED" ? (
                                <button
                                  onClick={() => handleUpdateQuestionStatus(q.id, "ANSWERED")}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                                  title="Tandai Selesai Dijawab"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Terjawab</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateQuestionStatus(q.id, "APPROVED")}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs"
                                >
                                  Batal Terjawab
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                                title="Hapus Pertanyaan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE POLLS MANAGEMENT */}
        {activeTab === "polls" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Daftar Polling & Kuis</h2>
                <p className="text-xs text-slate-400">
                  Luncurkan satu polling dalam satu waktu untuk dijawab peserta langsung di ponsel mereka.
                </p>
              </div>

              <button
                onClick={() => setIsNewPollModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Polling Baru</span>
              </button>
            </div>

            {/* Polls List */}
            {polls.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                <BarChart2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400 mb-1">Belum Ada Polling</p>
                <p className="text-xs text-slate-500 mb-4">Buat polling pilihan ganda, word cloud, atau skala rating.</p>
                <button
                  onClick={() => setIsNewPollModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Buat Polling Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <div
                    key={poll.id}
                    className={`p-5 rounded-2xl border transition ${
                      poll.isActive
                        ? "bg-slate-900 border-emerald-500/70 ring-1 ring-emerald-500/50 shadow-xl"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                            {poll.type === "MULTIPLE_CHOICE" && "Pilihan Ganda"}
                            {poll.type === "WORD_CLOUD" && "Word Cloud"}
                            {poll.type === "RATING" && "Rating / Skala"}
                          </span>
                          {poll.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Sedang Aktif di Layar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500">
                              Non-aktif
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            • {poll.responses?.length || 0} suara masuk
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white">{poll.title}</h3>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center gap-2">
                        {poll.isActive ? (
                          <button
                            onClick={() => handleTogglePollActive(poll.id, true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Hentikan Polling</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePollActive(poll.id, false)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Luncurkan ke Peserta</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleTogglePollResults(poll.id, poll.showResults)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          title={poll.showResults ? "Sembunyikan Hasil dari Peserta" : "Tampilkan Hasil ke Peserta"}
                        >
                          {poll.showResults ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        </button>

                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Poll Summary Preview */}
                    {poll.type === "MULTIPLE_CHOICE" && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        {poll.options.map((opt) => {
                          const votes = poll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                          const total = poll.responses?.length || 0;
                          const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                          return (
                            <div key={opt.id} className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/40 px-3 py-2 rounded-lg">
                              <span>{opt.optionText}</span>
                              <span className="font-mono font-bold text-white">{votes} suara ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS & QR CODE */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-base text-white mb-2">QR Code & Tautan Akses Peserta</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Tampilkan QR Code ini di layar proyektor atau masukkan ke slide materi presentasi Anda agar peserta dapat langsung bergabung tanpa instalasi aplikasi.
              </p>

              {qrDataUrl && (
                <div className="flex flex-col items-center p-6 bg-white rounded-2xl w-fit mx-auto mb-6 shadow-xl">
                  <img src={qrDataUrl} alt="QR Code Join" className="w-48 h-48" />
                  <p className="text-slate-900 font-mono font-black text-lg mt-3">#{event.code}</p>
                  <p className="text-slate-500 text-xs">{joinUrl}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <a
                  href={qrDataUrl}
                  download={`QR-${event.code}.png`}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar QR (PNG)</span>
                </a>
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-base text-white mb-4">Informasi Sesi Training</h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Kode Sesi (Event Code)</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold text-sm">
                    #{event.code}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Judul Sesi</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium">
                    {event.title}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Tautan Langsung Peserta</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono select-all">
                    {joinUrl}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Aplikasi ini dirancang untuk deployment langsung ke VPS atau Cloud (Node.js/Docker). Semua interaksi tersimpan secara lokal di database SQLite yang ringan dan cepat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE NEW POLL MODAL */}
      {isNewPollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Buat Polling Baru</h3>
            <p className="text-xs text-slate-400 mb-5">
              Pilih tipe interaksi yang diinginkan untuk peserta training.
            </p>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tipe Polling</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPollType("MULTIPLE_CHOICE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      newPollType === "MULTIPLE_CHOICE"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    Pilihan Ganda
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPollType("WORD_CLOUD")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      newPollType === "WORD_CLOUD"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    Word Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPollType("RATING")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      newPollType === "RATING"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    Rating (1-5)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Pertanyaan / Topik</label>
                <input
                  type="text"
                  placeholder="Contoh: Apa tantangan terbesar Anda saat ini?"
                  value={newPollTitle}
                  onChange={(e) => setNewPollTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Options for Multiple Choice */}
              {newPollType === "MULTIPLE_CHOICE" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Pilihan Opsi Jawaban</label>
                  <div className="space-y-2">
                    {newPollOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newPollOptions];
                            updated[idx] = e.target.value;
                            setNewPollOptions(updated);
                          }}
                          placeholder={`Opsi ${idx + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {newPollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPollOptions(newPollOptions.filter((_, i) => i !== idx));
                            }}
                            className="px-2 text-slate-500 hover:text-rose-400 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewPollOptions([...newPollOptions, `Opsi ${newPollOptions.length + 1}`])}
                      className="text-xs text-indigo-400 hover:underline font-medium"
                    >
                      + Tambah Opsi Lain
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPollModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Simpan Polling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

