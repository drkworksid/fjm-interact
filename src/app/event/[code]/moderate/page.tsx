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
  Check,
  Trophy,
  Lock,
  Unlock,
  Megaphone,
  Image as ImageIcon,
  Upload,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import Link from "next/link";
import TrainerPinGate from "@/components/TrainerPinGate";

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
  isModerationEnabled: boolean;
  isAnonymousAllowed: boolean;
  status: string;
  highlightedQuestionId: string | null;
  announcement?: string | null;
  trainerPin?: string;
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
  const [newPollImageUrl, setNewPollImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newPollType, setNewPollType] = useState<"MULTIPLE_CHOICE" | "WORD_CLOUD" | "RATING" | "QUIZ">("MULTIPLE_CHOICE");
  const [newPollOptions, setNewPollOptions] = useState<string[]>(["Opsi 1", "Opsi 2"]);
  const [newQuizCorrectIndex, setNewQuizCorrectIndex] = useState<number>(0);
  const [newQuizTimer, setNewQuizTimer] = useState<number>(20);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Silakan pilih file gambar (JPG, PNG, WebP).");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setNewPollImageUrl(compressedDataUrl);
        setIsUploadingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Announcement State
  const [announcementInput, setAnnouncementInput] = useState("");
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Change Session PIN State
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [oldSessionPin, setOldSessionPin] = useState("");
  const [newSessionPin, setNewSessionPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState("");
  const [pinChangeSuccess, setPinChangeSuccess] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const handleUpdateSessionPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError("");
    setPinChangeSuccess("");

    if (!/^\d{6}$/.test(newSessionPin)) {
      setPinChangeError("PIN baru harus berupa 6 digit angka.");
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          oldPin: oldSessionPin,
          newPin: newSessionPin,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPinChangeSuccess("PIN sesi berhasil diperbarui!");
        if (event) {
          setEvent({ ...event, trainerPin: newSessionPin });
        }
        setOldSessionPin("");
        setNewSessionPin("");
        setTimeout(() => {
          setIsChangePinModalOpen(false);
          setPinChangeSuccess("");
        }, 1500);
      } else {
        setPinChangeError(data.error || "Gagal mengubah PIN sesi.");
      }
    } catch (e) {
      setPinChangeError("Terjadi kesalahan koneksi.");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleToggleEventStatus = async () => {
    if (!event) return;
    const nextStatus = event.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      await fetch(`/api/events/${eventCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    try {
      await fetch(`/api/events/${eventCode}/announcement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: announcementInput.trim() }),
      });
      setIsAnnouncementModalOpen(false);
      fetchEventData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAnnouncement = async () => {
    try {
      await fetch(`/api/events/${eventCode}/announcement`, {
        method: "DELETE",
      });
      setAnnouncementInput("");
      fetchEventData();
    } catch (e) {
      console.error(e);
    }
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

  const handleUpdateQuizState = async (pollId: string, quizState: string) => {
    try {
      await fetch(`/api/events/${eventCode}/polls/${pollId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizState }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollTitle.trim()) return;

    try {
      let preparedOptions: any[] = [];
      if (newPollType === "MULTIPLE_CHOICE") {
        preparedOptions = newPollOptions.filter((o) => o.trim());
      } else if (newPollType === "QUIZ") {
        preparedOptions = newPollOptions
          .filter((o) => o.trim())
          .map((text, idx) => ({
            text,
            isCorrect: idx === newQuizCorrectIndex,
          }));
      }

      const res = await fetch(`/api/events/${eventCode}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPollTitle.trim(),
          imageUrl: newPollImageUrl.trim() || undefined,
          type: newPollType,
          options: preparedOptions,
          timerSeconds: newPollType === "QUIZ" ? newQuizTimer : 0,
          isActive: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsNewPollModalOpen(false);
        setNewPollTitle("");
        setNewPollImageUrl("");
        setNewPollOptions(["Opsi 1", "Opsi 2"]);
        setNewQuizCorrectIndex(0);
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
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Memuat Panel Kontrol Trainer...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <h2 className="text-xl font-bold mb-2">Event Tidak Ditemukan</h2>
        <Link href="/dashboard" className="text-blue-600 font-bold hover:underline text-sm">
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
    <TrainerPinGate eventCode={eventCode} eventTitle={event.title}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Top Bar Trainer Navigation */}
        <header className="border-b border-slate-200 bg-white/95 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 transition"
            >
              ← Dashboard
            </Link>
            <img
              src="/fjm-logo.png"
              alt="FJM Logo"
              className="h-9 w-auto object-contain hidden sm:block"
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                  #{event.code}
                </span>
                <h1 className="font-black text-base text-slate-900 leading-tight">{event.title}</h1>
                <span className="text-[10px] font-black text-white bg-blue-600 px-2 py-0.5 rounded ml-1">
                  FJM InterAct
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">PT Fiqry Jaya Manunggal • Panel Moderasi Sesi</p>
            </div>
          </div>

          {/* Action Buttons for Stage, Participant views, & Export */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export Dropdown / Buttons */}
            <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5 text-xs font-semibold">
              <a
                href={`/api/events/${event.code}/export?type=qa`}
                download
                className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg flex items-center gap-1.5 transition"
                title="Unduh seluruh daftar pertanyaan & upvotes ke format Excel/CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Ekspor Q&A</span>
              </a>
              <span className="text-slate-300">|</span>
              <a
                href={`/api/events/${event.code}/export?type=polls`}
                download
                className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg flex items-center gap-1.5 transition"
                title="Unduh seluruh hasil rekap polling ke format Excel/CSV"
              >
                <Download className="w-3.5 h-3.5 text-red-600" />
                <span>Ekspor Polling</span>
              </a>
            </div>

            <Link
              href={`/event/${event.code}/present`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Layar Proyektor</span>
            </Link>
            <Link
              href={`/${event.code}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 transition border border-red-200 shadow-xs"
            >
              <span>Tampilan Peserta (HP)</span>
            </Link>

            {/* Lock Access Button */}
            <button
              onClick={async () => {
                await fetch("/api/auth/pin", { method: "DELETE" });
                window.location.reload();
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 transition cursor-pointer"
              title="Kunci Akses Trainer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

      {/* Secondary Bar: Moderation Switch & Status */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("qa")}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === "qa"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Audience Q&A</span>
            {pendingQuestions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                {pendingQuestions.length} pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("polls")}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === "polls"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Live Polling & Kuis</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
              {polls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan & QR Code</span>
          </button>
        </div>

        {/* Action Toggles: Moderation, Lock Q&A, Announcement */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Announcement Button */}
          <button
            onClick={() => {
              setAnnouncementInput(event.announcement || "");
              setIsAnnouncementModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-500" />
            <span>Siarkan Pengumuman</span>
          </button>

          {/* Lock / Close Q&A Button */}
          <button
            onClick={handleToggleEventStatus}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
              event.status === "CLOSED"
                ? "bg-red-50 border-red-300 text-red-700 ring-1 ring-red-400"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
            title="Kunci sesi agar peserta tidak bisa menambah pertanyaan baru"
          >
            {event.status === "CLOSED" ? (
              <>
                <Lock className="w-3.5 h-3.5 text-red-600" />
                <span>Q&A Ditutup (Kunci)</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Q&A Aktif Terbuka</span>
              </>
            )}
          </button>

          {/* Moderation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={event.isModerationEnabled}
              onChange={handleToggleModeration}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-700">
              Moderasi:{" "}
              <strong className={event.isModerationEnabled ? "text-amber-600 font-black" : "text-slate-500"}>
                {event.isModerationEnabled ? "Aktif" : "Non-aktif"}
              </strong>
            </span>
          </label>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Active Announcement Alert */}
        {event.announcement && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Pengumuman Aktif di HP Peserta:{" "}
                <strong className="text-slate-900 font-bold">"{event.announcement}"</strong>
              </span>
            </div>
            <button
              onClick={handleClearAnnouncement}
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold shrink-0 transition"
            >
              Hapus Pengumuman ✕
            </button>
          </div>
        )}

        {/* Closed Session Alert */}
        {event.status === "CLOSED" && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Sesi Q&A Sedang Dikunci:</strong> Peserta tidak dapat mengirim pertanyaan baru saat ini.
              </span>
            </div>
            <button
              onClick={handleToggleEventStatus}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 transition"
            >
              Buka Kembali Sesi
            </button>
          </div>
        )}

        {/* TAB 1: AUDIENCE Q&A MODERATION */}
        {activeTab === "qa" && (
          <div>
            {/* Filter buttons */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setQaFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    qaFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua ({questions.length})
                </button>
                <button
                  onClick={() => setQaFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    qaFilter === "pending"
                      ? "bg-amber-100 text-amber-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Perlu Review ({pendingQuestions.length})
                </button>
                <button
                  onClick={() => setQaFilter("approved")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    qaFilter === "approved" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tampil ({questions.filter((q) => q.status === "APPROVED" || q.status === "HIGHLIGHTED").length})
                </button>
                <button
                  onClick={() => setQaFilter("answered")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    qaFilter === "answered" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Terjawab ({questions.filter((q) => q.status === "ANSWERED").length})
                </button>
              </div>

              {event.highlightedQuestionId && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-amber-900 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ada 1 pertanyaan sedang disorot di proyektor</span>
                  <button
                    onClick={() => handleToggleHighlight(event.highlightedQuestionId!)}
                    className="text-red-600 hover:underline text-[11px] font-black ml-1"
                  >
                    (Lepas Sorotan)
                  </button>
                </div>
              )}
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Tidak ada pertanyaan pada filter ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q) => {
                  const isHighlighted = q.id === event.highlightedQuestionId;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border transition shadow-xs ${
                        isHighlighted
                          ? "bg-amber-50/70 border-2 border-amber-400 shadow-sm"
                          : q.status === "PENDING"
                          ? "bg-amber-50/40 border-amber-300"
                          : "bg-white border-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-xs text-slate-900">
                              {q.isAnonymous ? "Anonim" : q.authorName}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">
                              {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Status Badges */}
                            {q.status === "PENDING" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Perlu Review
                              </span>
                            )}
                            {q.status === "ANSWERED" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Selesai Terjawab
                              </span>
                            )}
                            {isHighlighted && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Sedang di Proyektor
                              </span>
                            )}
                          </div>

                          <p className="text-base text-slate-900 font-bold mb-3 leading-relaxed">
                            {q.content}
                          </p>

                          {/* Upvotes Counter */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-black text-slate-900">{q.upvotes}</span>
                            <span>upvotes dari peserta</span>
                          </div>
                        </div>

                        {/* Action Controls for Trainer */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end max-w-xs">
                          {q.status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleUpdateQuestionStatus(q.id, "APPROVED")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => handleUpdateQuestionStatus(q.id, "REJECTED")}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 text-xs font-semibold transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Highlight Toggle */}
                              <button
                                onClick={() => handleToggleHighlight(q.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs ${
                                  isHighlighted
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
                                    : "bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200"
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{isHighlighted ? "Lepas Layar" : "Sorot ke Layar"}</span>
                              </button>

                              {/* Mark Answered */}
                              {q.status !== "ANSWERED" ? (
                                <button
                                  onClick={() => handleUpdateQuestionStatus(q.id, "ANSWERED")}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Terjawab</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateQuestionStatus(q.id, "APPROVED")}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 text-xs font-semibold transition"
                                >
                                  Kembalikan
                                </button>
                              )}
                            </>
                          )}

                          {/* Delete Question */}
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                            title="Hapus Pertanyaan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                <h2 className="text-xl font-black text-slate-900">Daftar Polling & Kuis</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Luncurkan satu polling dalam satu waktu untuk dijawab peserta langsung di ponsel mereka.
                </p>
              </div>

              <button
                onClick={() => setIsNewPollModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Polling Baru</span>
              </button>
            </div>

            {/* Polls List */}
            {polls.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <BarChart2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 mb-1">Belum Ada Polling</p>
                <p className="text-xs text-slate-500 mb-4">Buat polling pilihan ganda, word cloud, atau skala rating.</p>
                <button
                  onClick={() => setIsNewPollModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Buat Polling Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => (
                  <div
                    key={poll.id}
                    className={`p-5 rounded-2xl border transition shadow-xs ${
                      poll.isActive
                        ? "bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-md"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {poll.type === "MULTIPLE_CHOICE" && "Pilihan Ganda"}
                            {poll.type === "WORD_CLOUD" && "Word Cloud"}
                            {poll.type === "RATING" && "Rating / Skala"}
                            {poll.type === "QUIZ" && "🏆 Kuis Live"}
                          </span>
                          {poll.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              Sedang Aktif di Layar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                              Non-aktif
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-medium">
                            • {poll.responses?.length || 0} suara masuk
                          </span>
                        </div>

                        <div className="flex items-start gap-3 mt-1.5">
                          {poll.imageUrl && (
                            <img
                              src={poll.imageUrl}
                              alt="Gambar Polling"
                              className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100 shadow-2xs"
                            />
                          )}
                          <h3 className="text-base font-black text-slate-900 leading-snug">{poll.title}</h3>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center gap-2">
                        {poll.isActive ? (
                          <button
                            onClick={() => handleTogglePollActive(poll.id, true)}
                            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Hentikan Polling</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePollActive(poll.id, false)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Luncurkan ke Peserta</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleTogglePollResults(poll.id, poll.showResults)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                          title={poll.showResults ? "Sembunyikan Hasil dari Peserta" : "Tampilkan Hasil ke Peserta"}
                        >
                          {poll.showResults ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                        </button>

                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                          title="Hapus Polling"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quiz Stage Flow Controls */}
                    {poll.type === "QUIZ" && poll.isActive && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-800 font-bold flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>Alur Panggung Kuis:</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleUpdateQuizState(poll.id, "QUESTION")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              (poll.quizState || "QUESTION") === "QUESTION"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            1. Tampil Soal & Hitung Mundur
                          </button>
                          <button
                            onClick={() => handleUpdateQuizState(poll.id, "REVEALED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              poll.quizState === "REVEALED"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            2. Buka Kunci Jawaban
                          </button>
                          <button
                            onClick={() => handleUpdateQuizState(poll.id, "LEADERBOARD")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                              poll.quizState === "LEADERBOARD"
                                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            3. Tampilkan Leaderboard 🏆
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Poll & Quiz Summary Preview */}
                    {(poll.type === "MULTIPLE_CHOICE" || poll.type === "QUIZ") && (
                      <div className="space-y-1.5 pt-3 border-t border-slate-100">
                        {poll.options.map((opt) => {
                          const votes = poll.responses?.filter((r) => r.optionId === opt.id).length || 0;
                          const total = poll.responses?.length || 0;
                          const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                                opt.isCorrect
                                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold"
                                  : "text-slate-700 bg-slate-50 border border-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{opt.optionText}</span>
                                {opt.isCorrect && (
                                  <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                    ✓ KUNCI BENAR
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-slate-900">{votes} suara ({pct}%)</span>
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
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-base text-slate-900 mb-2">QR Code & Tautan Akses Peserta</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Tampilkan QR Code ini di layar proyektor atau masukkan ke slide materi presentasi Anda agar peserta dapat langsung bergabung tanpa instalasi aplikasi.
              </p>

              {qrDataUrl && (
                <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-200 rounded-2xl w-fit mx-auto mb-6 shadow-xs">
                  <img src={qrDataUrl} alt="QR Code Join" className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200" />
                  <p className="text-red-600 font-mono font-black text-xl mt-3">#{event.code}</p>
                  <p className="text-slate-500 text-xs font-medium">{joinUrl}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <a
                  href={qrDataUrl}
                  download={`QR-${event.code}.png`}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar QR (PNG)</span>
                </a>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-base text-slate-900 mb-4">Informasi Sesi Training</h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Kode Sesi (Event Code)</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-red-600 font-black text-sm">
                    #{event.code}
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">Judul Sesi</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold">
                    {event.title}
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">Tautan Langsung Peserta</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-blue-600 font-mono select-all font-semibold">
                    {joinUrl}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-bold block">PIN Keamanan Trainer Sesi Ini</label>
                    <button
                      type="button"
                      onClick={() => {
                        setOldSessionPin("");
                        setNewSessionPin("");
                        setPinChangeError("");
                        setPinChangeSuccess("");
                        setIsChangePinModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition"
                    >
                      Ubah PIN Sesi
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 font-black text-sm">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>{event.trainerPin || "262626"}</span>
                    <span className="text-[10px] font-sans font-normal text-slate-400 ml-auto">
                      Hanya trainer sesi ini & Admin yang dapat mengakses
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Aplikasi ini dirancang untuk PT Fiqry Jaya Manunggal. Semua interaksi peserta, polling, dan skor kuis tersimpan secara real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE NEW POLL MODAL */}
      {isNewPollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">Buat Polling Baru</h3>
            <p className="text-xs text-slate-500 mb-5">
              Pilih tipe interaksi yang diinginkan untuk peserta training.
            </p>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Tipe Interaksi</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPollType("MULTIPLE_CHOICE")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      newPollType === "MULTIPLE_CHOICE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Pilihan Ganda
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPollType("QUIZ")}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition ${
                      newPollType === "QUIZ"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🏆 Kuis Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPollType("WORD_CLOUD")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      newPollType === "WORD_CLOUD"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Word Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPollType("RATING")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      newPollType === "RATING"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Rating (1-5)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {newPollType === "QUIZ" ? "Pertanyaan Kuis *" : "Pertanyaan / Topik Polling *"}
                </label>
                <input
                  type="text"
                  placeholder={newPollType === "QUIZ" ? "Contoh: Manakah yang merupakan keunggulan arsitektur cloud serverless?" : "Contoh: Apa tantangan terbesar Anda saat ini?"}
                  value={newPollTitle}
                  onChange={(e) => setNewPollTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:text-slate-900"
                />
              </div>

              {/* Insert Gambar Pertanyaan (Opsional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gambar Pertanyaan (Opsional)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Bagan, Diagram, atau Ilustrasi Soal</span>
                </label>

                {!newPollImageUrl ? (
                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition group block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 group-hover:text-blue-700">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>{isUploadingImage ? "Memproses Gambar..." : "Unggah Gambar dari Perangkat"}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP, GIF</p>
                    </label>

                    <input
                      type="url"
                      placeholder="Atau tempel URL gambar (https://...)"
                      value={newPollImageUrl}
                      onChange={(e) => setNewPollImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                ) : (
                  <div className="relative border border-slate-200 rounded-2xl p-2.5 bg-slate-50 flex items-center gap-3">
                    <img
                      src={newPollImageUrl}
                      alt="Preview Gambar Pertanyaan"
                      className="w-24 h-20 object-cover rounded-xl border border-slate-200 bg-white shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Gambar Berhasil Dilampirkan</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Akan tampil di layar proyektor & HP peserta</p>
                      <button
                        type="button"
                        onClick={() => setNewPollImageUrl("")}
                        className="mt-2 text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ✕ Hapus Gambar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Timer for Quiz */}
              {newPollType === "QUIZ" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Timer Hitung Mundur</label>
                  <div className="flex gap-2">
                    {[10, 15, 20, 30, 45].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setNewQuizTimer(sec)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          newQuizTimer === sec
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Options for Multiple Choice or Quiz */}
              {(newPollType === "MULTIPLE_CHOICE" || newPollType === "QUIZ") && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      {newPollType === "QUIZ" ? "Pilihan Jawaban (Pilih radio sebagai Kunci Benar):" : "Pilihan Opsi Jawaban"}
                    </label>
                    {newPollType === "QUIZ" && (
                      <span className="text-[11px] text-blue-600 font-bold">Kunci Benar</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {newPollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {newPollType === "QUIZ" && (
                          <input
                            type="radio"
                            name="quizCorrectOption"
                            checked={newQuizCorrectIndex === idx}
                            onChange={() => setNewQuizCorrectIndex(idx)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="Tandai sebagai jawaban benar"
                          />
                        )}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newPollOptions];
                            updated[idx] = e.target.value;
                            setNewPollOptions(updated);
                          }}
                          placeholder={`Opsi ${idx + 1}`}
                          className={`flex-1 px-3 py-2 rounded-xl bg-slate-50 border text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:text-slate-900 ${
                            newPollType === "QUIZ" && newQuizCorrectIndex === idx
                              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 font-bold text-slate-900"
                              : "border-slate-300 focus:ring-blue-500 focus:bg-white focus:text-slate-900"
                          }`}
                        />
                        {newPollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewPollOptions(newPollOptions.filter((_, i) => i !== idx));
                              if (newQuizCorrectIndex >= idx && newQuizCorrectIndex > 0) {
                                setNewQuizCorrectIndex(newQuizCorrectIndex - 1);
                              }
                            }}
                            className="px-2 text-slate-400 hover:text-red-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewPollOptions([...newPollOptions, `Opsi ${newPollOptions.length + 1}`])}
                      className="text-xs text-blue-600 hover:underline font-bold"
                    >
                      + Tambah Opsi Lain
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPollModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition"
                >
                  Simpan Polling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-slate-900">Siarkan Pengumuman Langsung</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Pesan ini akan langsung muncul sebagai banner prioritas di bagian atas layar ponsel semua peserta training secara real-time.
            </p>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Isi Pesan Pengumuman *
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Sesi istirahat 15 menit. Silakan download materi sesi 2 di: bit.ly/materi-fjm"
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  required
                  maxLength={160}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
                <div className="text-[11px] text-slate-400 text-right mt-1">
                  {announcementInput.length}/160 karakter
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {event.announcement ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleClearAnnouncement();
                      setIsAnnouncementModalOpen(false);
                    }}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Hapus Pengumuman Aktif
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnnouncementModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 transition"
                  >
                    Siarkan Sekarang 📢
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CHANGE SESSION PIN MODAL */}
      {isChangePinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-slate-900 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Ubah PIN Sesi #{event.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Perbarui 6 angka PIN trainer untuk sesi ini. Trainer lain tidak akan dapat mengakses sesi ini jika tidak memiliki PIN baru.
            </p>

            {pinChangeError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinChangeError}</span>
              </div>
            )}

            {pinChangeSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pinChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSessionPin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Lama Sesi Ini (atau Master PIN Admin)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Masukkan 6 angka PIN saat ini"
                  value={oldSessionPin}
                  onChange={(e) => setOldSessionPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Baru Khusus Sesi Ini (6 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Masukkan 6 angka PIN baru"
                  value={newSessionPin}
                  onChange={(e) => setNewSessionPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPin || oldSessionPin.length !== 6 || newSessionPin.length !== 6}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isUpdatingPin ? "Menyimpan..." : "Simpan PIN Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </TrainerPinGate>
  );
}
