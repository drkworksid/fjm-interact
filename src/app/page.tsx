"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, BarChart2, ShieldCheck, ArrowRight, Sparkles, Smartphone, Monitor, Settings } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = eventCode.trim().replace(/^#/, "").toUpperCase();
    if (!cleanCode) {
      setError("Silakan masukkan kode event");
      return;
    }
    router.push(`/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-indigo-800/40 backdrop-blur-md bg-slate-950/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-indigo-500/25 tracking-tighter">
            FJM
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-emerald-300 bg-clip-text text-transparent">
              FJM InterAct
            </h1>
            <p className="text-xs text-indigo-300/70">PT Fiqry Jaya Manunggal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Dashboard Trainer</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Platform Interaksi Training & Meeting PT Fiqry Jaya Manunggal</span>
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 max-w-3xl leading-tight">
          Buat Audiens Anda{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
            Terhubung & Aktif
          </span>
        </h2>
        <p className="text-slate-300 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Platform interaksi audiens tanpa download aplikasi. Peserta dapat bertanya secara anonim atau bernama, upvote pertanyaan terbaik, dan menjawab live polling secara real-time.
        </p>

        {/* Join Box for Participants */}
        <div className="w-full max-w-md bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl mb-10 text-left">
          <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2">
            Ikuti Sesi Training (Sebagai Peserta)
          </label>
          <form onSubmit={handleJoin} className="space-y-3">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-indigo-400 font-bold text-lg select-none">#</span>
              <input
                type="text"
                placeholder="Masukkan Kode Event (misal: TRAIN26)"
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase());
                  setError("");
                }}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-indigo-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold uppercase text-lg tracking-wider"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Masuk ke Sesi</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Quick Demo Event */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Sesi training demo aktif:</span>
            <button
              onClick={() => router.push("/TRAIN26")}
              className="font-mono text-emerald-400 hover:text-emerald-300 font-semibold underline decoration-dotted"
            >
              #TRAIN26 (Klik untuk Masuk)
            </button>
          </div>
        </div>

        {/* 3 Main Pillars Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Peserta (Zero Login)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan QR code atau buka link. Tanya pertanyaan, upvote, dan jawab polling langsung dari HP tanpa perlu akun.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Layar Proyektor (Big Screen)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tampilan fullscreen 16:9 untuk proyektor/TV. Sorot pertanyaan terbaik dan animasi polling real-time.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Kontrol Trainer (Moderasi)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review pertanyaan masuk, sorot pertanyaan ke proyektor dalam 1 klik, dan kendalikan sesi polling.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-indigo-900/40 py-4 px-6 text-center text-xs text-indigo-300/60 flex flex-col md:flex-row items-center justify-between gap-2 max-w-5xl mx-auto w-full">
        <span>FJM InterAct • Aplikasi Interaksi Pelatihan & Rapat</span>
        <span className="font-medium">Hak Cipta © PT Fiqry Jaya Manunggal (FJM)</span>
      </footer>
    </div>
  );
}
