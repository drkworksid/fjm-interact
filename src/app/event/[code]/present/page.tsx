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
  Star,
  Trophy,
  Award,
  Flame,
  Check,
  Clock,
  Palette
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
  type: string;
  isActive: boolean;
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

  useEffect(() => {
    const saved = localStorage.getItem("fjm_presenter_theme") as "indigo" | "light" | "oled";
    if (saved) setStageTheme(saved);
  }, []);

  const changeTheme = (th: "indigo" | "light" | "oled") => {
    setStageTheme(th);
    localStorage.setItem("fjm_presenter_theme", th);
  };

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

  const activePoll = polls.find((p) => p.isActive);
  const highlightedQuestion = questions.find((q) => q.id === event.highlightedQuestionId);

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
          ? "min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 lg:p-10 select-none font-sans"
          : stageTheme === "oled"
          ? "min-h-screen bg-black text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none font-sans"
          : "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-6 lg:p-10 select-none font-sans"
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

          {/* Theme Selector */}
          <div
            className={`flex items-center rounded-xl p-1 border text-xs font-bold ${
              stageTheme === "light"
                ? "bg-slate-100 border-slate-200"
                : "bg-slate-800/80 border-slate-700"
            }`}
          >
            <button
              onClick={() => changeTheme("light")}
              className={`px-2.5 py-1 rounded-lg transition ${
                stageTheme === "light"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Tema Terang (Latar Putih Bersih)"
            >
              Terang
            </button>
            <button
              onClick={() => changeTheme("indigo")}
              className={`px-2.5 py-1 rounded-lg transition ${
                stageTheme === "indigo"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-800"
              }`}
              title="Tema Indigo"
            >
              Indigo
            </button>
            <button
              onClick={() => changeTheme("oled")}
              className={`px-2.5 py-1 rounded-lg transition ${
                stageTheme === "oled"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-800"
              }`}
              title="Tema OLED Gelap"
            >
              OLED
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl transition ${
              stageTheme === "light"
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            }`}
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
        ) : activePoll ? (
          /* SCENARIO 2: A Poll is Active */
          <div
            className={`rounded-3xl p-8 lg:p-12 shadow-xl ${
              stageTheme === "light"
                ? "bg-white border-2 border-slate-200 text-slate-900"
                : "bg-slate-900/90 border border-indigo-500/30 text-white backdrop-blur-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider ${
                  stageTheme === "light"
                    ? "bg-blue-50 border border-blue-200 text-blue-700"
                    : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                Live Polling: {activePoll.type.replace("_", " ")}
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-1.5 ${
                  stageTheme === "light" ? "text-slate-500" : "text-slate-400"
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>{activePoll.responses?.length || 0} Respons Masuk</span>
              </span>
            </div>

            <h2
              className={`text-3xl lg:text-4xl font-black mb-8 leading-snug ${
                stageTheme === "light" ? "text-slate-900" : "text-white"
              }`}
            >
              {activePoll.title}
            </h2>

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

                          // Light vs Dark Styles
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
                              {isRevealed && (
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

                              {isRevealed && (
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
                          {/* Animated progress fill */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-700 rounded-2xl ${
                              stageTheme === "light" ? "bg-blue-600" : "bg-gradient-to-r from-indigo-600 to-indigo-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />

                          <div className="relative z-10 w-full flex items-center justify-between">
                            <span
                              className={`text-lg lg:text-xl font-black ${
                                stageTheme === "light" && percent < 40 ? "text-slate-900" : "text-white drop-shadow"
                              }`}
                            >
                              {opt.optionText}
                            </span>
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
                {(() => {
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
                })()}
              </div>
            )}
          </div>
        ) : (
          /* SCENARIO 3: Default Q&A Questions Board */
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
    </div>
  );
}
