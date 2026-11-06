"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import {
  MessageSquare,
  BarChart2,
  ThumbsUp,
  Send,
  User,
  EyeOff,
  Sparkles,
  Wifi,
  WifiOff,
  CheckCircle2,
  Flame,
  Clock,
  ChevronRight,
  Star,
  Check,
  Edit2,
  Megaphone,
  X
} from "lucide-react";

interface Question {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  status: string;
  createdAt: string;
  votes?: { voterToken: string }[];
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
  announcement?: string | null;
}

export default function ParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const eventCode = (params.code as string)?.toUpperCase();

  // State
  const [event, setEvent] = useState<EventData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeTab, setActiveTab] = useState<"qa" | "polls">("qa");
  const [sortBy, setSortBy] = useState<"top" | "recent">("top");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);

  // Participant Identity (Zero-Login)
  const [voterToken, setVoterToken] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>("");

  // Question Submission Form
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Poll Submission Form
  const [wordCloudInput, setWordCloudInput] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Initialize participant token and profile from localStorage
  useEffect(() => {
    let token = localStorage.getItem("slido_voter_token");
    if (!token) {
      token = "usr_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem("slido_voter_token", token);
    }
    setVoterToken(token);

    const savedName = localStorage.getItem("slido_participant_name") || "Peserta Training";
    const savedAnon = localStorage.getItem("slido_is_anonymous") === "true";
    setAuthorName(savedName);
    setTempName(savedName);
    setIsAnonymous(savedAnon);
  }, []);

  // Fetch Event Data
  const fetchEventData = async () => {
    try {
      const res = await fetch(`/api/events/${eventCode}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Event tidak ditemukan");
        setIsLoading(false);
        return;
      }
      setEvent(data.event);
      setQuestions(data.event.questions || []);
      setPolls(data.event.polls || []);
      if (data.event.announcement) {
        setAnnouncement(data.event.announcement);
      }
      setIsLoading(false);
    } catch (err: any) {
      setError("Gagal memuat event. Periksa koneksi Anda.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!eventCode) return;
    fetchEventData();

    // Setup Socket.io
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      socket.emit("join_event", eventCode);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }

    socket.on("disconnect", onDisconnect);

    // Socket Event Handlers
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
            return {
              ...q,
              upvotes: payload.upvotes,
              votes: payload.question?.votes || q.votes,
            };
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
          // If updatedPoll is active, deactivate others
          if (updatedPoll.isActive) return { ...p, isActive: false };
          return p;
        });
      });
    });

    socket.on("poll:voted", (updatedPoll: Poll) => {
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    socket.on("event:announcement", ({ announcement }: { announcement: string | null }) => {
      setAnnouncement(announcement);
      setIsAnnouncementDismissed(false);
    });

    // Auto-sync fallback (guarantees updates in Serverless / Vercel environments)
    const fallbackSync = setInterval(() => {
      fetchEventData();
    }, 3000);

    return () => {
      clearInterval(fallbackSync);
      socket.emit("leave_event", eventCode);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("question:created");
      socket.off("question:voted");
      socket.off("question:status_updated");
      socket.off("question:deleted");
      socket.off("event:highlighted");
      socket.off("event:updated");
      socket.off("poll:status_updated");
      socket.off("poll:voted");
      socket.off("event:announcement");
    };
  }, [eventCode]);

  // Save Name Change
  const saveName = () => {
    const clean = tempName.trim() || "Peserta Training";
    setAuthorName(clean);
    localStorage.setItem("slido_participant_name", clean);
    setIsEditingName(false);
  };

  // Toggle Upvote
  const handleToggleVote = async (questionId: string) => {
    if (!voterToken) return;

    // Optimistic UI update
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const userVoted = q.votes?.some((v) => v.voterToken === voterToken);
          const newVotes = userVoted
            ? (q.votes || []).filter((v) => v.voterToken !== voterToken)
            : [...(q.votes || []), { voterToken }];
          return {
            ...q,
            upvotes: userVoted ? Math.max(0, q.upvotes - 1) : q.upvotes + 1,
            votes: newVotes,
          };
        }
        return q;
      })
    );

    try {
      await fetch(`/api/events/${eventCode}/questions/${questionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterToken }),
      });
    } catch (e) {
      // Revert if error
      fetchEventData();
    }
  };

  // Submit Question
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch(`/api/events/${eventCode}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: questionText.trim(),
          authorName: authorName.trim() || "Peserta",
          isAnonymous,
          voterToken,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuestionText("");
        if (event?.isModerationEnabled) {
          setSubmitFeedback("Pertanyaan terkirim! Menunggu persetujuan trainer sebelum tampil.");
        } else {
          setSubmitFeedback("Pertanyaan Anda berhasil diajukan!");
        }
        setTimeout(() => setSubmitFeedback(null), 4000);
      } else {
        alert(data.error || "Gagal mengirim pertanyaan");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi saat mengirim pertanyaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote on Poll Option
  const handleVotePollOption = async (pollId: string, optionId: string) => {
    if (!voterToken) return;
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId,
          participantToken: voterToken,
          participantName: isAnonymous ? "Anonim" : authorName,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Word Cloud Response
  const handleSubmitWordCloud = async (pollId: string) => {
    if (!wordCloudInput.trim() || !voterToken) return;
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textResponse: wordCloudInput.trim(),
          participantToken: voterToken,
          participantName: isAnonymous ? "Anonim" : authorName,
        }),
      });
      setWordCloudInput("");
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Rating Response
  const handleSubmitRating = async (pollId: string, ratingValue: number) => {
    setSelectedRating(ratingValue);
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratingValue,
          participantToken: voterToken,
          participantName: isAnonymous ? "Anonim" : authorName,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-slate-800 font-bold text-lg">Memuat Sesi #{eventCode}...</h2>
        <p className="text-slate-500 text-sm mt-1">Menghubungkan ke ruang interaksi training</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <WifiOff className="w-7 h-7" />
        </div>
        <h2 className="text-slate-900 font-bold text-xl mb-2">Event Tidak Ditemukan</h2>
        <p className="text-slate-600 text-sm mb-6">{error || "Kode event tidak valid atau sesi telah berakhir."}</p>
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const activePoll = polls.find((p) => p.isActive);

  // Filter visible questions: approved or highlighted
  const visibleQuestions = questions.filter(
    (q) => q.status === "APPROVED" || q.status === "HIGHLIGHTED" || q.status === "ANSWERED"
  );

  // Sort questions
  const sortedQuestions = [...visibleQuestions].sort((a, b) => {
    // Put highlighted question always on top
    if (a.id === event.highlightedQuestionId) return -1;
    if (b.id === event.highlightedQuestionId) return 1;

    if (sortBy === "top") {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col max-w-lg mx-auto shadow-xl border-x border-slate-200">
      {/* Top Header */}
      <header className="bg-indigo-900 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded bg-indigo-700 font-black text-[10px] text-white tracking-tight shrink-0">
              FJM
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-700/80 text-emerald-300 font-mono text-xs font-bold tracking-wider shrink-0">
              #{event.code}
            </span>
            <h1 className="font-bold text-sm text-white truncate">{event.title}</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-medium bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-300 font-medium bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* User Profile Bar (Zero-Login / Name Switcher) */}
        <div className="flex items-center justify-between text-xs text-indigo-200 pt-1 border-t border-indigo-800/60">
          <div className="flex items-center gap-1.5">
            {isAnonymous ? (
              <div className="flex items-center gap-1 bg-indigo-800/80 px-2 py-0.5 rounded-md text-indigo-300">
                <EyeOff className="w-3 h-3 text-indigo-300" />
                <span>Anonim</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-indigo-800/80 px-2 py-0.5 rounded-md text-white font-medium">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="truncate max-w-[140px]">{authorName}</span>
              </div>
            )}
            <button
              onClick={() => setIsEditingName(true)}
              className="text-[11px] text-indigo-300 hover:text-white underline decoration-dotted flex items-center gap-0.5 ml-1"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>Ganti</span>
            </button>
          </div>

          <span className="text-[11px] text-indigo-300/80">
            {visibleQuestions.length} Pertanyaan
          </span>
        </div>
      </header>

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">Identitas Peserta</h3>
            <p className="text-xs text-slate-500 mb-4">
              Nama ini akan muncul pada pertanyaan Anda kecuali Anda memilih anonim.
            </p>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Ketik nama Anda..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={40}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditingName(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={saveName}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Q&A vs Polls) */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-[73px] z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("qa")}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "qa"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tanya Jawab (Q&A)</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {visibleQuestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("polls")}
            className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
              activeTab === "polls"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Live Polling</span>
            {activePoll && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute -top-1 -right-1" />
            )}
            {activePoll && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-1 -right-1" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {activeTab === "qa" ? (
          <div>
            {/* Ask Question Box */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-5">
              <form onSubmit={handleSubmitQuestion}>
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Tulis pertanyaan Anda untuk sesi training ini..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    maxLength={300}
                    className="w-full p-3 text-sm text-slate-800 placeholder-slate-400 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition"
                  />
                  <div className="text-[11px] text-slate-400 text-right mt-0.5">
                    {questionText.length}/300
                  </div>
                </div>

                {submitFeedback && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{submitFeedback}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  {event.isAnonymousAllowed && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => {
                          setIsAnonymous(e.target.checked);
                          localStorage.setItem("slido_is_anonymous", e.target.checked ? "true" : "false");
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 font-medium">Kirim Anonim</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={!questionText.trim() || isSubmitting}
                    className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Mengirim..." : "Kirim"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Questions Header & Sorting */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pertanyaan Audiens
              </span>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setSortBy("top")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    sortBy === "top"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500" />
                    Terpopuler
                  </span>
                </button>
                <button
                  onClick={() => setSortBy("recent")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    sortBy === "recent"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Terbaru
                  </span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {sortedQuestions.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1">Belum Ada Pertanyaan</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Jadilah yang pertama mengajukan pertanyaan kepada trainer pada form di atas!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedQuestions.map((q) => {
                  const isHighlighted = q.id === event.highlightedQuestionId;
                  const hasVoted = q.votes?.some((v) => v.voterToken === voterToken);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl bg-white border transition shadow-sm ${
                        isHighlighted
                          ? "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20"
                          : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {/* Highlighted Banner if shown on presenter screen */}
                      {isHighlighted && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-2.5">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Sedang Dibahas di Layar Utama</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-normal text-slate-800 leading-relaxed mb-2 select-text">
                            {q.content}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="font-medium text-slate-600">
                              {q.isAnonymous ? "Anonim" : q.authorName}
                            </span>
                            <span>•</span>
                            <span>{new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {q.status === "ANSWERED" && (
                              <span className="inline-flex items-center gap-0.5 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Terjawab
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Upvote Button */}
                        <button
                          onClick={() => handleToggleVote(q.id)}
                          className={`flex flex-col items-center justify-center min-w-[48px] px-2 py-2 rounded-xl border transition-all ${
                            hasVoted
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 mb-0.5 ${hasVoted ? "stroke-[2.5]" : ""}`} />
                          <span className="text-xs font-bold">{q.upvotes}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Live Polls Tab */
          <div>
            {!activePoll ? (
              <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Belum Ada Polling Aktif</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Trainer belum membuka sesi polling. Layar ini akan otomatis berganti begitu trainer meluncurkan polling.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                    {activePoll.type === "MULTIPLE_CHOICE" && "Pilihan Ganda"}
                    {activePoll.type === "WORD_CLOUD" && "Word Cloud"}
                    {activePoll.type === "RATING" && "Rating / Skala"}
                    {activePoll.type === "OPEN_TEXT" && "Pertanyaan Terbuka"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {activePoll.responses?.length || 0} respons
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 mb-5 leading-snug">
                  {activePoll.title}
                </h2>

                {/* Multiple Choice Poll */}
                {activePoll.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {(() => {
                      const totalVotes = activePoll.responses?.length || 0;
                      const userResponse = activePoll.responses?.find(
                        (r) => r.participantToken === voterToken
                      );

                      return activePoll.options.map((opt) => {
                        const optCount =
                          activePoll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                        const percentage = totalVotes > 0 ? Math.round((optCount / totalVotes) * 100) : 0;
                        const isSelected = userResponse?.optionId === opt.id;

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleVotePollOption(activePoll.id, opt.id)}
                            className={`w-full relative text-left p-4 rounded-xl border transition-all overflow-hidden ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            {/* Percentage Bar Background if showResults is on */}
                            {activePoll.showResults && (
                              <div
                                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                                  isSelected ? "bg-indigo-100" : "bg-slate-100"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            )}

                            <div className="relative flex items-center justify-between gap-3 z-10">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span
                                  className={`text-sm ${
                                    isSelected ? "font-bold text-indigo-950" : "font-medium text-slate-800"
                                  }`}
                                >
                                  {opt.optionText}
                                </span>
                              </div>

                              {activePoll.showResults && (
                                <span className="text-xs font-bold text-slate-700 shrink-0">
                                  {percentage}%
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Word Cloud Poll */}
                {activePoll.type === "WORD_CLOUD" && (
                  <div>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Ketik 1-3 kata..."
                        value={wordCloudInput}
                        onChange={(e) => setWordCloudInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSubmitWordCloud(activePoll.id);
                          }
                        }}
                        maxLength={30}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleSubmitWordCloud(activePoll.id)}
                        disabled={!wordCloudInput.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        Kirim
                      </button>
                    </div>

                    {/* Word Cloud Tags List */}
                    <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Kata yang sudah dikirim:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activePoll.responses?.map((r, i) => (
                          <span
                            key={r.id || i}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              r.participantToken === voterToken
                                ? "bg-indigo-600 text-white font-bold"
                                : "bg-white text-slate-700 border border-slate-200"
                            }`}
                          >
                            {r.textResponse}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating Poll */}
                {activePoll.type === "RATING" && (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500 mb-4">Pilih nilai skala pemahaman (1 = Rendah, 5 = Sangat Paham):</p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isRated = selectedRating !== null && selectedRating >= star;
                        return (
                          <button
                            key={star}
                            onClick={() => handleSubmitRating(activePoll.id, star)}
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm transition-all ${
                              selectedRating === star
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110"
                                : isRated
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600 hover:bg-amber-50"
                            }`}
                          >
                            <Star className={`w-4 h-4 mb-0.5 ${isRated ? "fill-current" : ""}`} />
                            <span>{star}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedRating && (
                      <p className="text-xs font-semibold text-emerald-600">
                        Rating Anda: {selectedRating} dari 5 bintang tercatat!
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Participant Footer */}
      <footer className="py-2.5 px-4 text-center border-t border-slate-200 bg-white text-[11px] text-slate-400">
        <span>FJM InterAct • PT Fiqry Jaya Manunggal</span>
      </footer>
    </div>
  );
}

