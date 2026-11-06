"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, MessageSquare, BarChart2, ExternalLink, Settings, Monitor, Smartphone, Trash2, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base">
              S
            </div>
            <span className="font-bold text-white text-base">Slido Training</span>
          </Link>
          <span className="text-slate-600">•</span>
          <span className="text-xs font-semibold text-slate-400">Dashboard Trainer</span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Training Baru</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sesi Training Anda</h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola ruang interaksi audience Q&A, moderasi pertanyaan, dan live polling real-time.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Memuat data sesi...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-800">
              <Calendar className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Belum Ada Sesi Training</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Mulai buat sesi interaksi training pertama Anda untuk berinteraksi dengan audiens secara langsung.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30"
            >
              Buat Sesi Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                      #{evt.code}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(evt.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1.5">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {evt.description || "Tidak ada deskripsi"}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-5 pt-3 border-t border-slate-800/80">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <strong>{evt._count?.questions || 0}</strong> Pertanyaan
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>{evt._count?.polls || 0}</strong> Polling
                    </span>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-800">
                  <Link
                    href={`/event/${evt.code}/moderate`}
                    className="py-2 px-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Kontrol</span>
                  </Link>
                  <Link
                    href={`/event/${evt.code}/present`}
                    target="_blank"
                    className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition border border-slate-700"
                  >
                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Layar</span>
                  </Link>
                  <Link
                    href={`/${evt.code}`}
                    target="_blank"
                    className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex flex-col items-center justify-center gap-1 text-center transition border border-slate-700"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Buat Sesi Training Baru</h2>
            <p className="text-xs text-slate-400 mb-5">
              Tentukan judul sesi dan kode unik agar peserta dapat langsung bergabung.
            </p>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Judul Sesi Training *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Digital Leadership Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Kode Event Kustom (Opsional)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 font-bold select-none">#</span>
                  <input
                    type="text"
                    placeholder="Contoh: LEAD2026 (Kosongkan untuk otomatis)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Deskripsi / Petunjuk untuk Peserta (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Silakan ajukan pertanyaan terkait materi sesi hari ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isModerationEnabled}
                    onChange={(e) => setIsModerationEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      Aktifkan Moderasi Pertanyaan
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Pertanyaan peserta harus disetujui trainer sebelum tampil di layar.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white shadow-lg shadow-indigo-600/30"
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

