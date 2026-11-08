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
  X,
  Lock,
  Tag,
  AlignLeft,
  Lightbulb,
  Award,
  ClipboardList
} from "lucide-react";
import { IdeasPoll, RankingPoll, Survey } from "@/lib/types/interaction";
import ParticipantIdeasView from "@/components/ideas/ParticipantIdeasView";
import ParticipantRankingView from "@/components/ranking/ParticipantRankingView";
import ParticipantSurveyView from "@/components/survey/ParticipantSurveyView";

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
  createdAt?: string;
}

interface Poll {
  id: string;
  title: string;
  imageUrl?: string | null;
  type: string;
  isActive: boolean;
  isLocked?: boolean;
  showResults: boolean;
  quizState?: string;
  timerSeconds?: number;
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
  const [ideasPolls, setIdeasPolls] = useState<IdeasPoll[]>([]);
  const [rankingPolls, setRankingPolls] = useState<RankingPoll[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [interactionSubTab, setInteractionSubTab] = useState<"poll" | "ideas" | "ranking" | "survey">("poll");
  const [activeTab, setActiveTab] = useState<"qa" | "polls">("qa");
  const [sortBy, setSortBy] = useState<"top" | "recent">("top");
  const [isConnected, setIsConnected] = useState(false);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isBrowserOnline, setIsBrowserOnline] = useState(true);
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
  const [selectedTopicTag, setSelectedTopicTag] = useState<string>("Umum");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Poll Submission Form
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [wordCloudInput, setWordCloudInput] = useState("");
  const [openTextInput, setOpenTextInput] = useState("");
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
        setIsServerReachable(false);
        return;
      }
      setEvent(data.event);
      setQuestions(data.event.questions || []);
      setPolls(data.event.polls || []);
      setIdeasPolls(data.event.ideasPolls || []);
      setRankingPolls(data.event.rankingPolls || []);
      setSurveys(data.event.surveys || []);
      if (data.event.announcement !== announcement) {
        setAnnouncement(data.event.announcement || null);
        if (data.event.announcement) {
          setIsAnnouncementDismissed(false);
        }
      }
      setIsLoading(false);
      setIsServerReachable(true);
    } catch (err: any) {
      setIsServerReachable(false);
      if (isLoading) {
        setError("Gagal memuat event. Periksa koneksi Anda.");
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!eventCode) return;
    fetchEventData();

    // Track browser online status
    const handleOnline = () => {
      setIsBrowserOnline(true);
      fetchEventData();
    };
    const handleOffline = () => setIsBrowserOnline(false);

    if (typeof window !== "undefined") {
      setIsBrowserOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

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
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
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

    const finalContent =
      selectedTopicTag && selectedTopicTag !== "Umum"
        ? `[${selectedTopicTag}] ${questionText.trim()}`
        : questionText.trim();

    try {
      const res = await fetch(`/api/events/${eventCode}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: finalContent,
          authorName: authorName.trim() || "Peserta",
          isAnonymous,
          voterToken,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuestionText("");
        setSelectedTopicTag("Umum");
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

  // Submit Open Text (Paragraph) Response
  const handleSubmitOpenText = async (pollId: string) => {
    if (!openTextInput.trim() || !voterToken) return;
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textResponse: openTextInput.trim(),
          participantToken: voterToken,
          participantName: isAnonymous ? "Anonim" : authorName,
        }),
      });
      setOpenTextInput("");
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

  const activePoll = polls.find((p) => p.isActive);
  const activeIdeasPoll = ideasPolls.find((p) => p.status === "active") || ideasPolls[0];
  const activeRankingPoll = rankingPolls.find((p) => p.status === "active") || rankingPolls[0];
  const activeSurvey = surveys.find((p) => p.status === "active") || surveys[0];

  useEffect(() => {
    if (activeIdeasPoll?.status === "active" && !activePoll) {
      setInteractionSubTab("ideas");
    } else if (activeRankingPoll?.status === "active" && !activePoll) {
      setInteractionSubTab("ranking");
    } else if (activeSurvey?.status === "active" && !activePoll) {
      setInteractionSubTab("survey");
    }
  }, [activePoll, activeIdeasPoll?.status, activeRankingPoll?.status, activeSurvey?.status]);

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
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col w-full max-w-lg mx-auto shadow-xl border-x border-slate-200 overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-white text-slate-900 border-b border-slate-200 px-3.5 py-2.5 sticky top-0 z-30 shadow-xs w-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/fjm-logo.png" alt="FJM Logo" className="h-7 w-auto object-contain shrink-0" />
            <h1 className="font-extrabold text-sm text-slate-900 truncate">
              Interactive Q&A - Polls
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isBrowserOnline && (isConnected || isServerReachable) ? (
              <span className="flex items-center gap-1 text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* User Profile & Active Session Title */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-100 gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {isAnonymous ? (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-medium">
                <EyeOff className="w-3 h-3 text-slate-500" />
                <span>Anonim</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-blue-800 font-bold">
                <User className="w-3 h-3 text-blue-600" />
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{authorName}</span>
              </div>
            )}
            <button
              onClick={() => setIsEditingName(true)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline decoration-dotted flex items-center gap-0.5 ml-0.5"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>Ganti</span>
            </button>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 truncate min-w-0 text-right justify-end"
            title={event.title}
          >
            <span className="truncate max-w-[170px] sm:max-w-[240px]">{event.title}</span>
          </div>
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
      <div className="bg-white border-b border-slate-200 px-3.5 sm:px-4 flex items-center justify-between sticky top-[69px] z-20 w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab("qa")}
            className={`py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "qa"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tanya Jawab (Q&A)</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {visibleQuestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("polls")}
            className={`py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all relative ${
              activeTab === "polls"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Live Polling</span>
            {activePoll && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute -top-1 -right-1" />
            )}
            {activePoll && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 -right-1" />
            )}
          </button>
        </div>
      </div>

      {/* Broadcast Announcement Banner */}
      {announcement && !isAnnouncementDismissed && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 border-b border-amber-600 shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200 sticky top-[117px] z-20">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-full bg-white/30 shrink-0 mt-0.5">
              <Megaphone className="w-4 h-4 text-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] uppercase font-black tracking-wider bg-slate-950/15 px-1.5 py-0.2 rounded text-slate-900">
                  📢 Pengumuman Trainer
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-slate-950 leading-snug break-words">
                "{announcement}"
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAnnouncementDismissed(true)}
            className="p-1.5 rounded-xl hover:bg-black/10 active:bg-black/20 text-slate-900 transition shrink-0 cursor-pointer"
            title="Tutup pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {activeTab === "qa" ? (
          <div>
            {/* Ask Question Box or Locked Notice */}
            {event.status === "CLOSED" ? (
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center mb-5">
                <div className="inline-flex p-2.5 rounded-full bg-slate-200 text-slate-600 mb-2">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Sesi Tanya Jawab Ditutup</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trainer telah mengunci sesi pertanyaan. Anda masih dapat melihat dan mendukung (upvote) pertanyaan yang ada.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-5">
                <form onSubmit={handleSubmitQuestion}>
                  {/* Topic Tag Selector */}
                  <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1 shrink-0 mr-1">
                      <Tag className="w-3 h-3 text-slate-400" /> Topik:
                    </span>
                    {["Umum", "Materi", "Teknis", "Manajemen"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTopicTag(tag)}
                        className={`px-2.5 py-0.5 rounded-lg text-xs transition shrink-0 ${
                          selectedTopicTag === tag
                            ? "bg-indigo-600 text-white shadow-xs font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

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
                      className="ml-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? "Mengirim..." : "Kirim"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Questions Header & Sorting */}
            <div className="flex items-center justify-between mb-3 px-1 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
                Pertanyaan Audiens
              </span>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs shrink-0">
                <button
                  onClick={() => setSortBy("top")}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-medium transition text-[11px] sm:text-xs ${
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
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-medium transition text-[11px] sm:text-xs ${
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

                      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-normal text-slate-800 leading-relaxed mb-2 select-text break-words">
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
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 font-medium"
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
          /* Live Polls & Interactions Container */
          <div className="space-y-4">
            {/* Interaction Sub-tabs switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInteractionSubTab("poll")}
                className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  interactionSubTab === "poll"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Polling</span>
                {activePoll && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInteractionSubTab("ideas")}
                className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  interactionSubTab === "ideas"
                    ? "bg-white text-amber-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>💡 Ide</span>
                {activeIdeasPoll?.status === "active" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInteractionSubTab("ranking")}
                className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  interactionSubTab === "ranking"
                    ? "bg-white text-purple-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🏆 Peringkat</span>
                {activeRankingPoll?.status === "active" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setInteractionSubTab("survey")}
                className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  interactionSubTab === "survey"
                    ? "bg-white text-teal-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📋 Survei</span>
                {activeSurvey?.status === "active" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* Sub-tab content */}
            {interactionSubTab === "ideas" ? (
              activeIdeasPoll ? (
                <ParticipantIdeasView
                  poll={activeIdeasPoll}
                  voterToken={voterToken}
                  participantName={authorName}
                  isAnonymousDefault={isAnonymous}
                />
              ) : (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                    💡
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Belum Ada Sesi Ide Aktif</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Trainer belum meluncurkan sesi pengumpulan ide. Halaman ini akan diperbarui ketika sesi dimulai.
                  </p>
                </div>
              )
            ) : interactionSubTab === "ranking" ? (
              activeRankingPoll ? (
                <ParticipantRankingView
                  poll={activeRankingPoll}
                  voterToken={voterToken}
                  participantName={authorName}
                  isAnonymousDefault={isAnonymous}
                />
              ) : (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                    🏆
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Belum Ada Polling Peringkat</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Trainer belum membuka polling urutan/peringkat pilihan. Layar akan otomatis menyesuaikan saat dibuka.
                  </p>
                </div>
              )
            ) : interactionSubTab === "survey" ? (
              activeSurvey ? (
                <ParticipantSurveyView
                  survey={activeSurvey}
                  voterToken={voterToken}
                  participantName={authorName}
                  isAnonymousDefault={isAnonymous}
                />
              ) : (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                    📋
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Belum Ada Survei Aktif</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Trainer belum meluncurkan kuesioner survei. Silakan tunggu aba-aba dari trainer.
                  </p>
                </div>
              )
            ) : (
              /* Regular Poll Tab */
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
                    {activePoll.type === "QUIZ" && "🏆 Kuis Interaktif"}
                    {activePoll.type === "WORD_CLOUD" && "Word Cloud"}
                    {activePoll.type === "RATING" && "Rating / Skala"}
                    {activePoll.type === "OPEN_TEXT" && "💬 Teks Terbuka"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {activePoll.responses?.length || 0} respons
                  </span>
                </div>

                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900 mb-3 leading-snug">
                    {activePoll.title}
                  </h2>

                  {/* Poll Question Image on Mobile */}
                  {activePoll.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 mb-2">
                      <img
                        src={activePoll.imageUrl}
                        alt="Gambar Pertanyaan"
                        className="w-full max-h-64 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* QUIZ INTERACTIVE MODE */}
                {activePoll.type === "QUIZ" && (
                  <div>
                    {/* Stage 3: LEADERBOARD NOTICE */}
                    {activePoll.quizState === "LEADERBOARD" ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl shadow-md">
                          🏆
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">
                          Sesi Kuis Selesai!
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                          Lihat layar panggung proyektor utama untuk melihat podium 3 besar juara sesi ini!
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Revealed feedback banner */}
                        {activePoll.quizState === "REVEALED" && (() => {
                          const userResponse = activePoll.responses?.find((r) => r.participantToken === voterToken);
                          const correctOpt = activePoll.options.find((o) => o.isCorrect);
                          const isUserCorrect = userResponse?.optionId === correctOpt?.id;

                          return isUserCorrect ? (
                            <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                              <span className="text-lg">🎉</span>
                              <div>
                                <p className="font-extrabold text-sm">HORE! Jawaban Anda Benar</p>
                                <p className="font-normal text-[11px] text-emerald-700">+100 Poin tercatat untuk Leaderboard!</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                              <span className="text-lg">😅</span>
                              <div>
                                <p className="font-extrabold text-sm">Jawaban Kurang Tepat</p>
                                <p className="font-normal text-[11px] text-rose-700">Kunci jawaban yang benar: <strong>{correctOpt?.optionText}</strong></p>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-3">
                          {(() => {
                            const userResponse = activePoll.responses?.find((r) => r.participantToken === voterToken);
                            const isRevealed = activePoll.quizState === "REVEALED";
                            const letters = ["A", "B", "C", "D", "E"];

                            return activePoll.options.map((opt, idx) => {
                              const isSelected = userResponse?.optionId === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  disabled={isRevealed || !!userResponse}
                                  onClick={() => handleVotePollOption(activePoll.id, opt.id)}
                                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                                    isRevealed
                                      ? opt.isCorrect
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/30"
                                        : isSelected
                                        ? "border-rose-300 bg-rose-50/60 text-rose-900 opacity-70"
                                        : "border-slate-200 bg-slate-50 opacity-50"
                                      : isSelected
                                      ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/30"
                                      : "border-slate-200 hover:border-slate-300 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-700 border border-slate-300"
                                    }`}>
                                      {letters[idx]}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">
                                      {opt.optionText}
                                    </span>
                                  </div>

                                  {isRevealed && opt.isCorrect && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black shrink-0">
                                      ✓ BENAR
                                    </span>
                                  )}

                                  {!isRevealed && isSelected && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold shrink-0">
                                      Terkunci 🔒
                                    </span>
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple Choice Poll */}
                {activePoll.type === "MULTIPLE_CHOICE" && (
                  <div>
                    {(() => {
                      const totalVotes = activePoll.responses?.length || 0;
                      const userResponse = activePoll.responses?.find(
                        (r) => r.participantToken === voterToken
                      );
                      const hasVoted = !!userResponse;

                      return (
                        <div className="space-y-3">
                          {/* Options List */}
                          <div className="space-y-2.5">
                            {activePoll.options.map((opt) => {
                              const optCount =
                                activePoll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                              const percentage = totalVotes > 0 ? Math.round((optCount / totalVotes) * 100) : 0;
                              const isSelected = hasVoted
                                ? userResponse?.optionId === opt.id
                                : selectedOptionId === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={hasVoted || !!activePoll.isLocked}
                                  onClick={() => setSelectedOptionId(opt.id)}
                                  className={`w-full relative text-left p-3.5 sm:p-4 rounded-2xl border transition-all overflow-hidden ${
                                    hasVoted
                                      ? isSelected
                                        ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500"
                                        : "border-slate-200 bg-slate-50/50 opacity-70"
                                      : isSelected
                                      ? "border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/30 cursor-pointer"
                                      : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
                                  }`}
                                >
                                  {/* Percentage Bar Background only visible AFTER voting (and if showResults is enabled) */}
                                  {hasVoted && activePoll.showResults && (
                                    <div
                                      className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                                        isSelected ? "bg-blue-100/70" : "bg-slate-100"
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  )}

                                  <div className="relative flex items-center justify-between gap-3 z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "border-slate-300 bg-white"
                                        }`}
                                      >
                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <span
                                        className={`text-sm truncate ${
                                          isSelected ? "font-bold text-slate-950" : "font-medium text-slate-800"
                                        }`}
                                      >
                                        {opt.optionText}
                                      </span>
                                    </div>

                                    {/* Percentage text ONLY visible AFTER voting and if showResults is on */}
                                    {hasVoted && activePoll.showResults && (
                                      <span className="text-xs font-bold text-slate-700 shrink-0 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                                        {percentage}%
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Action Button / Feedback Badge */}
                          {!hasVoted ? (
                            <div className="pt-2">
                              {activePoll.isLocked ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
                                  <Lock className="w-4 h-4 text-amber-600" />
                                  <span>Polling telah dikunci oleh trainer.</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!selectedOptionId || isSubmittingPoll}
                                  onClick={async () => {
                                    if (!selectedOptionId) return;
                                    setIsSubmittingPoll(true);
                                    await handleVotePollOption(activePoll.id, selectedOptionId);
                                    setIsSubmittingPoll(false);
                                  }}
                                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <span>{isSubmittingPoll ? "Mengirim Jawaban..." : "Kirim Jawaban"}</span>
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="pt-2">
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Jawaban Anda telah terkirim</span>
                                </div>
                                <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                                  Terkunci 🔒
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Word Cloud Poll */}
                {activePoll.type === "WORD_CLOUD" && (
                  <div>
                    {(() => {
                      const userResponse = activePoll.responses?.find(
                        (r) => r.participantToken === voterToken
                      );
                      const hasVoted = !!userResponse;

                      return (
                        <div className="space-y-4">
                          {!hasVoted ? (
                            activePoll.isLocked ? (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4 text-amber-600" />
                                <span>Polling telah dikunci oleh trainer.</span>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                  Ketik jawaban kata Anda:
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Ketik 1-3 kata..."
                                    value={wordCloudInput}
                                    onChange={(e) => setWordCloudInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && wordCloudInput.trim() && !isSubmittingPoll) {
                                        e.preventDefault();
                                        setIsSubmittingPoll(true);
                                        handleSubmitWordCloud(activePoll.id).finally(() => setIsSubmittingPoll(false));
                                      }
                                    }}
                                    maxLength={30}
                                    disabled={isSubmittingPoll}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (!wordCloudInput.trim() || isSubmittingPoll) return;
                                      setIsSubmittingPoll(true);
                                      await handleSubmitWordCloud(activePoll.id);
                                      setIsSubmittingPoll(false);
                                    }}
                                    disabled={!wordCloudInput.trim() || isSubmittingPoll}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{isSubmittingPoll ? "Mengirim..." : "Kirim"}</span>
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            /* Locked confirmation banner */
                            <div className="space-y-3">
                              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <span>Kata Anda: </span>
                                    <strong className="text-emerald-950 underline decoration-emerald-500">&quot;{userResponse.textResponse}&quot;</strong>
                                  </div>
                                </div>
                                <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-black shrink-0">
                                  Terkunci 🔒
                                </span>
                              </div>

                              {/* Word Cloud Tags List: ONLY visible AFTER voting (and if showResults is enabled) */}
                              {activePoll.showResults && (
                                <div className="border border-slate-200 bg-slate-50 p-4 rounded-2xl animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between mb-2.5">
                                    <p className="text-xs font-bold text-slate-600">
                                      Kumpulan kata dari seluruh audiens:
                                    </p>
                                    <span className="text-[11px] font-bold text-blue-600">
                                      {activePoll.responses?.length || 0} Kata
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {activePoll.responses?.map((r, i) => {
                                      const isSelf = r.participantToken === voterToken;
                                      return (
                                        <span
                                          key={r.id || i}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition shadow-2xs ${
                                            isSelf
                                              ? "bg-blue-600 text-white ring-2 ring-blue-400"
                                              : "bg-white text-slate-800 border border-slate-200"
                                          }`}
                                        >
                                          {r.textResponse}
                                          {isSelf && " ✓"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Rating Poll */}
                {activePoll.type === "RATING" && (
                  <div className="text-center py-4">
                    {(() => {
                      const userResponse = activePoll.responses?.find(
                        (r) => r.participantToken === voterToken
                      );
                      const hasVoted = !!userResponse;
                      const activeRating = userResponse?.ratingValue ?? selectedRating;

                      return (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-500">
                            {hasVoted
                              ? "Rating Anda telah dicatat:"
                              : "Pilih nilai skala pemahaman (1 = Rendah, 5 = Sangat Paham):"}
                          </p>

                          <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isRated = activeRating !== null && activeRating >= star;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  disabled={hasVoted || !!activePoll.isLocked}
                                  onClick={() => handleSubmitRating(activePoll.id, star)}
                                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm transition-all ${
                                    activeRating === star
                                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105"
                                      : isRated
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-600 hover:bg-amber-50 disabled:hover:bg-slate-100"
                                  }`}
                                >
                                  <Star className={`w-4 h-4 mb-0.5 ${isRated ? "fill-current" : ""}`} />
                                  <span>{star}</span>
                                </button>
                              );
                            })}
                          </div>

                          {hasVoted ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Rating Anda ({userResponse?.ratingValue} dari 5 bintang) telah tercatat • Terkunci 🔒</span>
                            </div>
                          ) : (
                            activePoll.isLocked && (
                              <p className="text-xs font-bold text-amber-700">Polling rating telah dikunci oleh trainer.</p>
                            )
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Open Text (Paragraph / Multi-line) Poll */}
                {activePoll.type === "OPEN_TEXT" && (
                  <div>
                    {(() => {
                      const userResponse = activePoll.responses?.find(
                        (r) => r.participantToken === voterToken
                      );
                      const hasVoted = !!userResponse;

                      return (
                        <div className="space-y-4">
                          {!hasVoted ? (
                            activePoll.isLocked ? (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4 text-amber-600" />
                                <span>Polling telah dikunci oleh trainer.</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Tulis Jawaban / Pandangan Anda:</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                      {openTextInput.length}/1000
                                    </span>
                                  </label>
                                  <textarea
                                    rows={4}
                                    placeholder="Ketik jawaban Anda di sini (bisa berupa beberapa baris/paragraf)..."
                                    value={openTextInput}
                                    onChange={(e) => setOpenTextInput(e.target.value)}
                                    maxLength={1000}
                                    disabled={isSubmittingPoll}
                                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed resize-y"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!openTextInput.trim() || isSubmittingPoll) return;
                                    setIsSubmittingPoll(true);
                                    await handleSubmitOpenText(activePoll.id);
                                    setIsSubmittingPoll(false);
                                  }}
                                  disabled={!openTextInput.trim() || isSubmittingPoll}
                                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <span>{isSubmittingPoll ? "Mengirim Jawaban..." : "Kirim Jawaban"}</span>
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          ) : (
                            /* Submitted state */
                            <div className="space-y-3">
                              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Jawaban Anda telah terkirim</span>
                                </div>
                                <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-black shrink-0">
                                  Terkunci 🔒
                                </span>
                              </div>

                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Jawaban Anda:</span>
                                <p className="text-slate-800 whitespace-pre-wrap break-words leading-relaxed text-sm font-medium">
                                  {userResponse.textResponse}
                                </p>
                              </div>

                              {/* Responses list from all participants if showResults is enabled */}
                              {activePoll.showResults && (
                                <div className="border border-slate-200 bg-slate-50 p-4 rounded-2xl animate-in fade-in duration-200 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-700">
                                      Tanggapan seluruh peserta ({activePoll.responses?.length || 0}):
                                    </p>
                                  </div>
                                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {activePoll.responses?.map((r, i) => {
                                      const isSelf = r.participantToken === voterToken;
                                      return (
                                        <div
                                          key={r.id || i}
                                          className={`p-3 rounded-xl border text-xs ${
                                            isSelf
                                              ? "bg-blue-50/70 border-blue-200 text-slate-900"
                                              : "bg-white border-slate-200 text-slate-800"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                            <span className={isSelf ? "font-bold text-blue-700" : "font-bold text-slate-700"}>
                                              {r.participantName || "Anonim"} {isSelf && "(Anda)"}
                                            </span>
                                          </div>
                                          <p className="whitespace-pre-wrap break-words leading-relaxed font-normal">
                                            {r.textResponse}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
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

