"use client";

import { useEffect, useState, useRef } from "react";
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
  Star,
  Trophy,
  Award,
  Flame,
  Check,
  Clock,
  Palette,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle
} from "lucide-react";
import confetti from "canvas-confetti";
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
  isCorrect?: boolean;
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
  imageUrl?: string | null;
  type: string;
  isActive: boolean;
  isLocked?: boolean;
  showResults: boolean;
  quizState?: string; // QUESTION, REVEALED, LEADERBOARD
  timerSeconds?: number;
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
  const [stageTheme, setStageTheme] = useState<"indigo" | "light" | "oled">("light");

  // Presenter View Navigation State
  const [presenterView, setPresenterView] = useState<"poll" | "qa">("poll");
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const [isPollListDropdownOpen, setIsPollListDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fjm_presenter_theme") as "indigo" | "light" | "oled";
    if (saved) setStageTheme(saved);
  }, []);

  const changeTheme = (th: "indigo" | "light" | "oled") => {
    setStageTheme(th);
    localStorage.setItem("fjm_presenter_theme", th);
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPollListDropdownOpen(false);
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      if (updatedPoll.type === "QUIZ" && updatedPoll.quizState === "LEADERBOARD") {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }
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

    // Auto-sync fallback for Vercel Serverless
    const fallbackSync = setInterval(() => {
      fetchEventData();
    }, 3000);

    return () => {
      clearInterval(fallbackSync);
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

  const activePoll = polls.find((p) => p.isActive);
  const highlightedQuestion = questions.find((q) => q.id === event?.highlightedQuestionId);

  // Presenter Navigation Actions
  const handleTogglePollActive = async (pollId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchEventData();
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
      fetchEventData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePollLock = async (pollId: string, currentLocked: boolean) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !currentLocked }),
      });
      fetchEventData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchPoll = async (pollId: string) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      setPresenterView("poll");
      setIsPollListDropdownOpen(false);
      fetchEventData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextPoll = async () => {
    if (polls.length === 0) return;
    const currentIndex = activePoll ? polls.findIndex((p) => p.id === activePoll.id) : -1;
    const nextIndex = (currentIndex + 1) % polls.length;
    await handleSwitchPoll(polls[nextIndex].id);
  };

  const handlePrevPoll = async () => {
    if (polls.length === 0) return;
    const currentIndex = activePoll ? polls.findIndex((p) => p.id === activePoll.id) : 0;
    const prevIndex = (currentIndex - 1 + polls.length) % polls.length;
    await handleSwitchPoll(polls[prevIndex].id);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (activePoll) {
          handleTogglePollActive(activePoll.id, activePoll.isActive);
        } else if (polls.length > 0) {
          handleSwitchPoll(polls[0].id);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNextPoll();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrevPoll();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        if (activePoll) {
          handleTogglePollResults(activePoll.id, activePoll.showResults);
        }
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        if (activePoll) {
          handleTogglePollLock(activePoll.id, !!activePoll.isLocked);
        }
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        setPresenterView("qa");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setPresenterView("poll");
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePoll, polls, presenterView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-800">Menyiapkan Layar Presenter #{eventCode}...</h2>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center font-sans">
        <h2 className="text-xl font-bold">Event #{eventCode} tidak ditemukan</h2>
      </div>
    );
  }

  // Calculate Leaderboard across all Quizzes
  const getLeaderboard = () => {
    const scoreMap: Record<string, { name: string; score: number }> = {};
    polls.filter((p) => p.type === "QUIZ").forEach((quiz) => {
      (quiz.responses || []).forEach((r) => {
        const isCorrect = quiz.options.find((o) => o.id === r.optionId)?.isCorrect;
        if (isCorrect) {
          const token = r.participantToken;
          const name = r.participantName || "Peserta";
          if (!scoreMap[token]) {
            scoreMap[token] = { name, score: 0 };
          }
          scoreMap[token].score += 100;
        }
      });
    });
    return Object.values(scoreMap).sort((a, b) => b.score - a.score);
  };

  // Filter approved questions for stage view
  const approvedQuestions = questions.filter(
    (q) => q.status === "APPROVED" || q.status === "HIGHLIGHTED" || q.status === "ANSWERED"
  );
  const sortedQuestions = [...approvedQuestions].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <div
      className={
        stageTheme === "light"
          ? "min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 lg:p-10 select-none font-sans relative pb-28"
          : stageTheme === "oled"
          ? "min-h-screen bg-black text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none font-sans relative pb-28"
          : "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none font-sans relative pb-28"
      }
    >
      {/* Top Bar for Presenter Mode */}
      <header
        className={`flex items-center justify-between gap-6 pb-6 border-b ${
          stageTheme === "light" ? "border-slate-200" : "border-slate-800/80"
        }`}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/fjm-logo.png"
              alt="FJM Logo"
              className="h-10 w-auto object-contain bg-white rounded-xl p-1.5 shadow-xs border border-slate-200"
            />
            <span className="text-xs font-black tracking-wider uppercase text-white bg-blue-600 px-3 py-1 rounded-lg shadow-xs">
              FJM InterAct
            </span>
            <span
              className={`text-xs font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full ${
                stageTheme === "light"
                  ? "text-red-700 bg-red-50 border border-red-200 font-black"
                  : "text-red-400 bg-red-950/60 border border-red-500/30"
              }`}
            >
              Layar Proyektor • Live
            </span>
          </div>
          <h1
            className={`text-2xl lg:text-3xl font-black tracking-tight ${
              stageTheme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            {event.title}
          </h1>
        </div>

        {/* Join Prompt & QR Box on Stage */}
        <div
          className={`flex items-center gap-4 rounded-2xl p-3 shadow-md backdrop-blur-md ${
            stageTheme === "light"
              ? "bg-white border border-slate-200"
              : "bg-slate-900/90 border border-indigo-500/30"
          }`}
        >
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs"
            />
          )}
          <div className="text-left pr-2">
            <p
              className={`text-xs font-semibold ${
                stageTheme === "light" ? "text-slate-500" : "text-indigo-300"
              }`}
            >
              Pindai QR atau buka tautan:
            </p>
            <p
              className={`text-sm lg:text-base font-bold tracking-wide ${
                stageTheme === "light" ? "text-slate-900" : "text-white"
              }`}
            >
              {joinUrl ? joinUrl.replace(/^https?:\/\//, "") : `/#${event.code}`}
            </p>
            <p className="text-xs text-red-600 font-mono font-black mt-0.5">
              Kode:{" "}
              <span
                className={`text-base font-black ${
                  stageTheme === "light" ? "text-red-600" : "text-white"
                }`}
              >
                #{event.code}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 my-8 flex flex-col justify-center max-w-6xl mx-auto w-full">
        {/* VIEW 1: Q&A Board or Spotlighted Question */}
        {presenterView === "qa" ? (
          <div>
            {highlightedQuestion ? (
              <div
                className={`rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden ${
                  stageTheme === "light"
                    ? "bg-white border-4 border-amber-400 text-slate-900"
                    : "bg-gradient-to-br from-indigo-900/70 to-slate-900/90 border-2 border-emerald-400/80 text-white backdrop-blur-xl"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black ${
                      stageTheme === "light"
                        ? "bg-amber-100 border border-amber-300 text-amber-900"
                        : "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    <span>SEDANG DIBAHAS DI PANGGUNG</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-lg ${
                      stageTheme === "light"
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "bg-indigo-950/80 border border-indigo-500/40 text-white"
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5 stroke-[2.5]" />
                    <span>{highlightedQuestion.upvotes} Suara</span>
                  </div>
                </div>

                <h2
                  className={`text-3xl lg:text-5xl font-black leading-tight mb-8 select-text ${
                    stageTheme === "light" ? "text-slate-950" : "text-white"
                  }`}
                >
                  "{highlightedQuestion.content}"
                </h2>

                <div
                  className={`flex items-center gap-3 pt-6 border-t ${
                    stageTheme === "light" ? "border-slate-100" : "border-white/10"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${
                      stageTheme === "light"
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {highlightedQuestion.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`text-base font-semibold ${
                      stageTheme === "light" ? "text-slate-600" : "text-indigo-200"
                    }`}
                  >
                    Diajukan oleh{" "}
                    <strong className={stageTheme === "light" ? "text-slate-900 font-bold" : "text-white"}>
                      {highlightedQuestion.isAnonymous ? "Peserta Anonim" : highlightedQuestion.authorName}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-xl lg:text-2xl font-black flex items-center gap-3 ${
                      stageTheme === "light" ? "text-slate-900" : "text-white"
                    }`}
                  >
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    <span>Pertanyaan Audiens Teratas</span>
                  </h2>
                  <span
                    className={`text-sm font-bold ${
                      stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {sortedQuestions.length} Total Pertanyaan
                  </span>
                </div>

                {sortedQuestions.length === 0 ? (
                  <div
                    className={`text-center py-20 rounded-3xl border ${
                      stageTheme === "light"
                        ? "bg-white border-slate-200 shadow-xs"
                        : "bg-slate-900/50 border-slate-800"
                    }`}
                  >
                    <p
                      className={`text-xl font-bold mb-2 ${
                        stageTheme === "light" ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
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
                        className={`p-6 rounded-2xl border transition shadow-sm flex items-start justify-between gap-4 ${
                          stageTheme === "light"
                            ? "bg-white border-slate-200 hover:border-blue-400"
                            : "bg-slate-900/80 border-slate-800 hover:border-indigo-500/50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`w-6 h-6 rounded-full font-mono text-xs font-black flex items-center justify-center ${
                                stageTheme === "light"
                                  ? "bg-red-50 text-red-600 border border-red-200"
                                  : "bg-indigo-500/20 text-indigo-300"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {q.isAnonymous ? "Anonim" : q.authorName}
                            </span>
                          </div>
                          <p
                            className={`text-lg font-black leading-relaxed line-clamp-3 ${
                              stageTheme === "light" ? "text-slate-900" : "text-white"
                            }`}
                          >
                            {q.content}
                          </p>
                        </div>

                        <div
                          className={`flex flex-col items-center justify-center min-w-[54px] px-3 py-3 rounded-xl shrink-0 font-bold ${
                            stageTheme === "light"
                              ? "bg-blue-50 border border-blue-200 text-blue-700"
                              : "bg-indigo-950/80 border border-indigo-500/30 text-white"
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5 mb-1" />
                          <span className="text-base font-black font-mono">{q.upvotes}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: Active Poll View */
          <div>
            {activePoll ? (
              <div
                className={`rounded-3xl p-8 lg:p-12 shadow-xl ${
                  stageTheme === "light"
                    ? "bg-white border-2 border-slate-200 text-slate-900"
                    : "bg-slate-900/90 border border-indigo-500/30 text-white backdrop-blur-xl"
                }`}
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider ${
                        stageTheme === "light"
                          ? "bg-blue-50 border border-blue-200 text-blue-700"
                          : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      Live Polling: {activePoll.type.replace("_", " ")}
                    </span>
                    {activePoll.isLocked && (
                      <span className="px-3 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Terkunci</span>
                      </span>
                    )}
                    {!activePoll.showResults && (
                      <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>Hasil Tersembunyi</span>
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold flex items-center gap-1.5 ${
                      stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{activePoll.responses?.length || 0} Respons Masuk</span>
                  </span>
                </div>

                <div className="mb-8">
                  <h2
                    className={`text-3xl lg:text-4xl font-black mb-4 leading-snug ${
                      stageTheme === "light" ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {activePoll.title}
                  </h2>

                  {/* Poll Question Image on Stage */}
                  {activePoll.imageUrl && (
                    <div className="mb-6 flex justify-center">
                      <div className="relative max-w-2xl max-h-80 overflow-hidden rounded-2xl border border-slate-200/80 shadow-lg bg-black/5">
                        <img
                          src={activePoll.imageUrl}
                          alt="Ilustrasi Pertanyaan Polling"
                          className="max-h-80 w-auto object-contain mx-auto rounded-2xl"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* LIVE QUIZ & LEADERBOARD MODE */}
                {activePoll.type === "QUIZ" && (
                  <div>
                    {/* STAGE 3: LEADERBOARD */}
                    {activePoll.quizState === "LEADERBOARD" ? (
                      <div className="py-4">
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-800 text-sm font-black mb-3">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <span>PAPAN PERINGKAT RESMI TRAINING (LEADERBOARD)</span>
                          </div>
                          <h2
                            className={`text-4xl lg:text-5xl font-black tracking-tight ${
                              stageTheme === "light" ? "text-slate-900" : "text-white"
                            }`}
                          >
                            Peringkat Juara Sesi
                          </h2>
                        </div>

                        {/* Top 3 Podium */}
                        {(() => {
                          const leaders = getLeaderboard();
                          const first = leaders[0];
                          const second = leaders[1];
                          const third = leaders[2];

                          if (leaders.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-500 text-base font-semibold">
                                Belum ada skor tercatat. Pastikan peserta menjawab dengan benar!
                              </div>
                            );
                          }

                          return (
                            <div>
                              <div className="flex items-end justify-center gap-4 lg:gap-8 max-w-2xl mx-auto mb-10 pt-8">
                                {/* #2 SILVER PODIUM (LEFT) */}
                                {second ? (
                                  <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-slate-200 border-2 border-slate-400 flex items-center justify-center font-black text-slate-800 text-base lg:text-xl shadow-lg mb-2">
                                      🥈
                                    </div>
                                    <span
                                      className={`text-sm lg:text-base font-bold truncate max-w-[140px] mb-0.5 ${
                                        stageTheme === "light" ? "text-slate-900" : "text-white"
                                      }`}
                                    >
                                      {second.name}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-500 mb-2">
                                      {second.score} Poin
                                    </span>
                                    <div className="w-full h-32 lg:h-40 rounded-t-2xl bg-gradient-to-t from-slate-200 to-slate-100 border-t-4 border-slate-400 flex items-center justify-center font-black text-2xl lg:text-4xl text-slate-600 shadow-md">
                                      2
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1" />
                                )}

                                {/* #1 GOLD PODIUM (CENTER) */}
                                {first && (
                                  <div className="flex flex-col items-center flex-1 z-10">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-amber-100 border-4 border-amber-400 flex items-center justify-center font-black text-slate-900 text-2xl lg:text-3xl shadow-2xl mb-2 animate-bounce">
                                      👑
                                    </div>
                                    <span
                                      className={`text-base lg:text-lg font-black truncate max-w-[160px] mb-0.5 ${
                                        stageTheme === "light" ? "text-slate-900" : "text-white"
                                      }`}
                                    >
                                      {first.name}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-amber-600 mb-2">
                                      {first.score} Poin
                                    </span>
                                    <div className="w-full h-44 lg:h-56 rounded-t-2xl bg-gradient-to-t from-amber-400 to-amber-300 border-t-4 border-amber-500 flex flex-col items-center justify-center font-black text-3xl lg:text-5xl text-slate-950 shadow-2xl">
                                      <span>1</span>
                                      <span className="text-xs font-black tracking-widest uppercase mt-1">JUARA 1</span>
                                    </div>
                                  </div>
                                )}

                                {/* #3 BRONZE PODIUM (RIGHT) */}
                                {third ? (
                                  <div className="flex flex-col items-center flex-1">
                                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-amber-800/20 border-2 border-amber-700 flex items-center justify-center font-black text-amber-900 text-base lg:text-xl shadow-lg mb-2">
                                      🥉
                                    </div>
                                    <span
                                      className={`text-sm lg:text-base font-bold truncate max-w-[140px] mb-0.5 ${
                                        stageTheme === "light" ? "text-slate-900" : "text-white"
                                      }`}
                                    >
                                      {third.name}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-500 mb-2">
                                      {third.score} Poin
                                    </span>
                                    <div className="w-full h-24 lg:h-28 rounded-t-2xl bg-gradient-to-t from-amber-700/30 to-amber-600/20 border-t-4 border-amber-700 flex items-center justify-center font-black text-2xl lg:text-4xl text-amber-900 shadow-md">
                                      3
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1" />
                                )}
                              </div>

                              {/* Remaining Leaderboard Rows (4-10) */}
                              {leaders.length > 3 && (
                                <div className="max-w-xl mx-auto space-y-2">
                                  {leaders.slice(3, 8).map((ldr, rankIdx) => (
                                    <div
                                      key={ldr.name + rankIdx}
                                      className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                                        stageTheme === "light"
                                          ? "bg-slate-50 border-slate-200 text-slate-900"
                                          : "bg-slate-900/60 border-slate-800 text-white"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-slate-400 font-bold w-6">
                                          #{rankIdx + 4}
                                        </span>
                                        <span className="font-semibold">{ldr.name}</span>
                                      </div>
                                      <span className="font-mono font-black text-amber-600">
                                        {ldr.score} Poin
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* STAGE 1 (QUESTION) OR STAGE 2 (REVEALED) */
                      <div>
                        {activePoll.quizState === "REVEALED" && (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black mb-5 shadow-xs">
                            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                            <span>KUNCI JAWABAN RESMI TERBUKA</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                          {(() => {
                            const total = activePoll.responses?.length || 0;
                            const isRevealed = activePoll.quizState === "REVEALED";
                            const letters = ["A", "B", "C", "D", "E", "F"];

                            return activePoll.options.map((opt, idx) => {
                              const optVotes =
                                activePoll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                              const percent = total > 0 ? Math.round((optVotes / total) * 100) : 0;

                              const lightCardStyles = [
                                "border-blue-200 bg-blue-50/50 hover:border-blue-400 text-slate-900",
                                "border-red-200 bg-red-50/50 hover:border-red-400 text-slate-900",
                                "border-amber-200 bg-amber-50/50 hover:border-amber-400 text-slate-900",
                                "border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 text-slate-900",
                              ];
                              const darkCardStyles = [
                                "border-rose-500/60 bg-rose-950/30 text-rose-100",
                                "border-sky-500/60 bg-sky-950/30 text-sky-100",
                                "border-amber-500/60 bg-amber-950/30 text-amber-100",
                                "border-emerald-500/60 bg-emerald-950/30 text-emerald-100",
                              ];

                              const baseStyle =
                                stageTheme === "light"
                                  ? lightCardStyles[idx % lightCardStyles.length]
                                  : darkCardStyles[idx % darkCardStyles.length];

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-6 rounded-2xl border-2 transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
                                    isRevealed
                                      ? opt.isCorrect
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-500/30 shadow-lg scale-[1.02]"
                                        : "border-slate-200 bg-slate-100/60 opacity-40 text-slate-400"
                                      : baseStyle
                                  }`}
                                >
                                  {/* Background percentage fill when revealed */}
                                  {isRevealed && activePoll.showResults && (
                                    <div
                                      className={`absolute left-0 top-0 bottom-0 transition-all duration-700 opacity-20 ${
                                        opt.isCorrect ? "bg-emerald-400" : "bg-slate-400"
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  )}

                                  <div className="relative z-10 flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${
                                          stageTheme === "light"
                                            ? "bg-slate-200 text-slate-900 border border-slate-300"
                                            : "bg-white/10 text-white border border-white/20"
                                        }`}
                                      >
                                        {letters[idx]}
                                      </span>
                                      <span
                                        className={`text-xl lg:text-2xl font-black leading-snug ${
                                          stageTheme === "light" ? "text-slate-900" : "text-white"
                                        }`}
                                      >
                                        {opt.optionText}
                                      </span>
                                    </div>

                                    {isRevealed && opt.isCorrect && (
                                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center gap-1 shadow-md">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>BENAR</span>
                                      </span>
                                    )}
                                  </div>

                                  {isRevealed && activePoll.showResults && (
                                    <div
                                      className={`relative z-10 flex items-center justify-between text-xs font-bold pt-2 border-t ${
                                        stageTheme === "light" ? "border-slate-200 text-slate-600" : "border-white/10 text-slate-300"
                                      }`}
                                    >
                                      <span>{optVotes} peserta</span>
                                      <span
                                        className={`font-mono text-lg font-black ${
                                          stageTheme === "light" ? "text-slate-900" : "text-white"
                                        }`}
                                      >
                                        {percent}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                            <div
                              className={`h-16 lg:h-20 rounded-2xl overflow-hidden relative border flex items-center px-6 ${
                                stageTheme === "light"
                                  ? "bg-slate-100 border-slate-200"
                                  : "bg-slate-800/80 border-slate-700/60"
                              }`}
                            >
                              {/* Animated progress fill (only if showResults is true) */}
                              {activePoll.showResults && (
                                <div
                                  className={`absolute left-0 top-0 bottom-0 transition-all duration-700 rounded-2xl ${
                                    stageTheme === "light" ? "bg-blue-600" : "bg-gradient-to-r from-indigo-600 to-indigo-500"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              )}

                              <div className="relative z-10 w-full flex items-center justify-between">
                                <span
                                  className={`text-lg lg:text-xl font-black ${
                                    stageTheme === "light" && (!activePoll.showResults || percent < 40)
                                      ? "text-slate-900"
                                      : "text-white drop-shadow"
                                  }`}
                                >
                                  {opt.optionText}
                                </span>
                                {activePoll.showResults ? (
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`text-sm font-bold ${
                                        stageTheme === "light" && percent < 80 ? "text-slate-600" : "text-blue-100"
                                      }`}
                                    >
                                      {optVotes} suara
                                    </span>
                                    <span
                                      className={`text-2xl lg:text-3xl font-black font-mono ${
                                        stageTheme === "light" && percent < 90 ? "text-slate-900" : "text-white"
                                      }`}
                                    >
                                      {percent}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-lg">
                                    Hasil disembunyikan
                                  </span>
                                )}
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
                  <div
                    className={`min-h-[300px] flex items-center justify-center p-6 rounded-2xl border ${
                      stageTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    {!activePoll.showResults ? (
                      <div className="text-center py-12 text-slate-500">
                        <EyeOff className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                        <p className="text-base font-bold">Hasil Word Cloud disembunyikan oleh presenter</p>
                      </div>
                    ) : (
                      (() => {
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
                            <p className="text-slate-400 text-lg font-medium">
                              Menunggu peserta memasukkan kata kunci...
                            </p>
                          );
                        }

                        const lightColors = [
                          "text-blue-600",
                          "text-red-600",
                          "text-slate-900",
                          "text-sky-600",
                          "text-emerald-600",
                          "text-amber-600",
                        ];
                        const darkColors = [
                          "text-indigo-400",
                          "text-emerald-400",
                          "text-amber-300",
                          "text-sky-300",
                          "text-rose-400",
                          "text-teal-300",
                        ];
                        const colors = stageTheme === "light" ? lightColors : darkColors;

                        return (
                          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 p-4">
                            {entries.map(([word, count], i) => {
                              const scale = 1 + (count / maxFreq) * 2;
                              const fontSize = `${Math.min(52, Math.max(20, 20 * scale))}px`;
                              const colorClass = colors[i % colors.length];

                              return (
                                <span
                                  key={word}
                                  style={{ fontSize }}
                                  className={`font-black tracking-wide ${colorClass} transition-all duration-300 hover:scale-110 drop-shadow-xs`}
                                >
                                  {word}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Rating Average View */}
                {activePoll.type === "RATING" && (
                  <div className="text-center py-8">
                    {!activePoll.showResults ? (
                      <div className="text-center py-12 text-slate-500">
                        <EyeOff className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                        <p className="text-base font-bold">Hasil rating rata-rata disembunyikan oleh presenter</p>
                      </div>
                    ) : (
                      (() => {
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
                            <div
                              className={`text-6xl lg:text-8xl font-black font-mono mb-2 ${
                                stageTheme === "light" ? "text-slate-900" : "text-amber-400"
                              }`}
                            >
                              {avg}
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-8 h-8 ${
                                    parseFloat(avg) >= s
                                      ? "text-amber-400 fill-amber-400"
                                      : stageTheme === "light"
                                      ? "text-slate-200"
                                      : "text-slate-700"
                                  }`}
                                />
                              ))}
                            </div>
                            <p
                              className={`text-base font-semibold ${
                                stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Berdasarkan {total} suara peserta
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* No Active Poll Fallback */
              <div
                className={`text-center py-20 rounded-3xl border ${
                  stageTheme === "light"
                    ? "bg-white border-slate-200 shadow-xs"
                    : "bg-slate-900/50 border-slate-800"
                }`}
              >
                <BarChart2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  Belum Ada Polling yang Sedang Berjalan
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Pilih polling dari panel navigasi presenter di bagian bawah layar atau tekan tombol di bawah untuk meluncurkan polling pertama.
                </p>
                {polls.length > 0 && (
                  <button
                    onClick={() => handleSwitchPoll(polls[0].id)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Mulai Polling: {polls[0].title}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`pt-4 border-t flex items-center justify-between text-xs ${
          stageTheme === "light" ? "border-slate-200 text-slate-500" : "border-slate-800/80 text-slate-500"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="font-bold text-slate-700">FJM InterAct</span>
          <span>•</span>
          <span>PT Fiqry Jaya Manunggal</span>
        </div>
        <Link
          href={`/event/${event.code}/moderate`}
          target="_blank"
          className="text-blue-600 hover:underline font-bold"
        >
          Buka Panel Kontrol Trainer (Tab Terpisah)
        </Link>
      </footer>

      {/* ======================================================== */}
      {/* 🌟 PRESENTER FLOATING NAVIGATION BAR (SLIDO-STYLE)      */}
      {/* ======================================================== */}
      <div ref={dropdownRef}>
        {isControlsMinimized ? (
          /* Minimized Floating Pill */
          <button
            onClick={() => setIsControlsMinimized(false)}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700/80 rounded-full px-4 py-2 shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition hover:scale-105 group"
            title="Tampilkan panel navigasi presenter"
          >
            <ChevronUp className="w-4 h-4 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
            <span>Kontrol Navigasi Presenter</span>
          </button>
        ) : (
          /* Expanded Floating Control Bar */
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-1.5 md:gap-2 text-white text-xs select-none max-w-[95vw] overflow-visible">
            {/* 1. Stop / Start Poll Button */}
            <div className="relative group shrink-0">
              <button
                onClick={() => {
                  if (activePoll) handleTogglePollActive(activePoll.id, activePoll.isActive);
                  else if (polls.length > 0) handleSwitchPoll(polls[0].id);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition shadow-xs ${
                  activePoll?.isActive
                    ? "bg-red-700 hover:bg-red-600 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {activePoll?.isActive ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>{activePoll?.isActive ? "Stop poll" : "Start poll"}</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">space</span>
              </div>
            </div>

            {/* 2. Prev Poll */}
            <div className="relative group shrink-0">
              <button
                onClick={handlePrevPoll}
                disabled={polls.length <= 1}
                className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 hover:text-white font-bold flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>Previous poll</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">←</span>
              </div>
            </div>

            {/* 4. Hide / Show Result */}
            <div className="relative group shrink-0">
              <button
                onClick={() => {
                  if (activePoll) handleTogglePollResults(activePoll.id, activePoll.showResults);
                }}
                disabled={!activePoll}
                className={`p-2 rounded-xl transition ${
                  !activePoll?.showResults
                    ? "bg-slate-800 text-amber-400"
                    : "hover:bg-slate-800 text-slate-200 hover:text-white"
                } disabled:opacity-30`}
              >
                {activePoll?.showResults ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>{activePoll?.showResults ? "Hide result" : "Show result"}</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">H</span>
              </div>
            </div>

            {/* 5. Lock / Unlock Poll */}
            <div className="relative group shrink-0">
              <button
                onClick={() => {
                  if (activePoll) handleTogglePollLock(activePoll.id, !!activePoll.isLocked);
                }}
                disabled={!activePoll}
                className={`p-2 rounded-xl transition ${
                  activePoll?.isLocked
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "hover:bg-slate-800 text-slate-200 hover:text-white"
                } disabled:opacity-30`}
              >
                {activePoll?.isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>{activePoll?.isLocked ? "Unlock poll" : "Lock poll"}</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">L</span>
              </div>
            </div>

            {/* 3. Next Poll */}
            <div className="relative group shrink-0">
              <button
                onClick={handleNextPoll}
                disabled={polls.length <= 1}
                className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 hover:text-white font-bold flex items-center gap-1 transition"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>Next poll</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">→</span>
              </div>
            </div>

            {/* 6. List of Polls Dropdown Selector */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPollListDropdownOpen((prev) => !prev);
                  setIsSettingsOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold flex items-center gap-1.5 max-w-[140px] md:max-w-[210px] transition cursor-pointer"
              >
                <span className="truncate">
                  {activePoll ? activePoll.title : "Daftar Polling"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isPollListDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-[100] space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                    <span>Daftar Polling Sesi</span>
                    <span className="text-blue-400 font-bold">{polls.length} Total</span>
                  </div>
                  {polls.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      Belum ada polling dibuat di sesi ini.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                      {polls.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchPoll(p.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            p.id === activePoll?.id
                              ? "bg-blue-600 text-white font-black shadow-md ring-1 ring-blue-400"
                              : "text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                p.id === activePoll?.id ? "bg-white text-blue-700" : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="truncate font-semibold">{p.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.isActive && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sedang Aktif" />
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {p.type === "QUIZ"
                                ? "🏆 Kuis"
                                : p.type === "WORD_CLOUD"
                                ? "☁️ Word Cloud"
                                : p.type === "RATING"
                                ? "⭐ Rating"
                                : "📊 Pilihan"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 9. Toggle: Show Q&A - Show Poll */}
            <div className="relative group shrink-0">
              <button
                onClick={() => setPresenterView(presenterView === "poll" ? "qa" : "poll")}
                className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                  presenterView === "qa"
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white"
                }`}
              >
                {presenterView === "poll" ? (
                  <>
                    <span>Show Q&A</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px]">
                      {approvedQuestions.length}
                    </span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Show Polls</span>
                  </>
                )}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>{presenterView === "poll" ? "Go to Q&A" : "Go to Polls"}</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">
                  {presenterView === "poll" ? "Q" : "P"}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-700 mx-1 shrink-0" />

            {/* Settings / Theme Popover Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setIsSettingsOpen(!isSettingsOpen);
                  setIsPollListDropdownOpen(false);
                }}
                className={`p-2 rounded-xl transition ${
                  isSettingsOpen ? "bg-slate-800 text-white" : "hover:bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Pengaturan Tema Layar"
              >
                <Settings className="w-4 h-4" />
              </button>
              {isSettingsOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-3 w-52 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tema Layar</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => { changeTheme("light"); setIsSettingsOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        stageTheme === "light" ? "bg-white text-slate-900 shadow-xs" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      Terang (Latar Putih)
                    </button>
                    <button
                      onClick={() => { changeTheme("indigo"); setIsSettingsOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        stageTheme === "indigo" ? "bg-blue-600 text-white shadow-xs" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      Indigo Modern
                    </button>
                    <button
                      onClick={() => { changeTheme("oled"); setIsSettingsOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                        stageTheme === "oled" ? "bg-black text-white border border-slate-700 shadow-xs" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      OLED Gelap
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 7. Full Screen Button */}
            <div className="relative group shrink-0">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>{isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}</span>
                <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono mt-0.5">F</span>
              </div>
            </div>

            {/* 8. Minimize Controls Button */}
            <div className="relative group shrink-0">
              <button
                onClick={() => setIsControlsMinimized(true)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition ml-0.5"
                title="Minimize panel kontrol"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 z-50">
                <span>Minimize panel</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
