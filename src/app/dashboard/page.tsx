"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, MessageSquare, BarChart2, Settings, Monitor, Smartphone, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EventItem {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  isModerationEnabled: boolean;
  createdAt: string;
  _count?: {
    questions: number;
    polls: number;
  };
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isModerationEnabled, setIsModerationEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          code: code.trim(),
          description: description.trim(),
          isModerationEnabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setTitle("");
        setCode("");
        setDescription("");
        fetchEvents();
        router.push(`/event/${data.event.code}/moderate`);
      } else {
        setErrorMessage(data.error || "Gagal membuat sesi");
      }
    } catch (err: any) {
      setErrorMessage("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Header */}
      <header className="border-b border-slate-200 bg-white/95 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Official FJM Logo */}
            <img
              src="/fjm-logo.png"
              alt="Logo PT Fiqry Jaya Manunggal"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="border-l border-slate-200 pl-3">
              <span className="font-black text-slate-900 text-lg leading-tight block tracking-tight">
                FJM InterAct
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                PT Fiqry Jaya Manunggal
              </span>
            </div>
          </Link>
          <span className="text-slate-300 ml-1 hidden sm:inline">•</span>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hidden sm:inline">
            Dashboard Trainer
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Training Baru</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Sesi Training & Meeting
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola ruang interaksi audience Q&A, moderasi pertanyaan, dan live polling real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl shadow-xs">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>FJM Training Hub System</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Memuat data sesi...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Calendar className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Sesi Training</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Mulai buat sesi interaksi training pertama Anda untuk berinteraksi dengan audiens secara langsung.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all"
            >
              Buat Sesi Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                      #{evt.code}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {new Date(evt.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 mb-1.5">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {evt.description || "Tidak ada deskripsi"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-600 mb-5 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <strong>{evt._count?.questions || 0}</strong> Pertanyaan
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-red-600" />
                      <strong>{evt._count?.polls || 0}</strong> Polling
                    </span>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/event/${evt.code}/moderate`}
                    className="py-2.5 px-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition shadow-xs"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Kontrol</span>
                  </Link>
                  <Link
                    href={`/event/${evt.code}/present`}
                    target="_blank"
                    className="py-2.5 px-1 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition shadow-xs"
                  >
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span>Layar</span>
                  </Link>
                  <Link
                    href={`/${evt.code}`}
                    target="_blank"
                    className="py-2.5 px-1 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition border border-red-200 shadow-xs"
                  >
                    <Smartphone className="w-4 h-4 text-red-600" />
                    <span>Peserta</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
              <img src="/fjm-logo.png" alt="FJM Logo" className="h-8 w-auto object-contain" />
              <div>
                <h2 className="text-base font-black text-slate-900">Buat Sesi Training Baru</h2>
                <p className="text-[11px] text-slate-500">PT Fiqry Jaya Manunggal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Tentukan judul sesi dan kode unik agar peserta dapat langsung bergabung.
            </p>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Judul Sesi Training *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Digital Leadership Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Kode Event Kustom (Opsional)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold select-none">#</span>
                  <input
                    type="text"
                    placeholder="Contoh: FJM2026 (Kosongkan untuk otomatis)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono uppercase text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Deskripsi / Petunjuk untuk Peserta (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Silakan ajukan pertanyaan terkait materi sesi hari ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 resize-none transition"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isModerationEnabled}
                    onChange={(e) => setIsModerationEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Aktifkan Moderasi Pertanyaan
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Pertanyaan peserta harus disetujui trainer sebelum tampil di layar.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-md shadow-blue-600/20 transition"
                >
                  {isSubmitting ? "Membuat..." : "Buat Sesi & Buka"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
