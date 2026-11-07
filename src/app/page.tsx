"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Smartphone, Monitor, Settings } from "lucide-react";
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Navbar Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src="/fjm-logo.png"
            alt="Logo PT Fiqry Jaya Manunggal"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          <div className="border-l border-slate-200 pl-3">
            <h1 className="font-black text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
              FJM InterAct
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">PT Fiqry Jaya Manunggal</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 lg:py-14 flex flex-col items-center justify-center text-center">
        {/* Dashboard Trainer Button (Moved above the platform badge) */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-sm hover:scale-105"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>Dashboard Trainer</span>
          </Link>
        </div>

        {/* Company Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-red-600" />
          <span>Platform Interaksi Training & Meeting</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-3 max-w-2xl leading-tight">
          Buat Audiens Anda{" "}
          <span className="text-red-600">Terhubung</span> &{" "}
          <span className="text-blue-600">Aktif</span>
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-xl mb-8 leading-relaxed font-normal">
          Platform interaksi audiens tanpa install aplikasi. Peserta dapat bertanya secara anonim atau bernama, 
          upvote pertanyaan terbaik, dan menjawab live polling secara real-time.
        </p>

        {/* Join Box for Participants */}
        <div className="w-full max-w-sm sm:max-w-md bg-white border-2 border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-lg shadow-slate-200/50 text-left mb-10">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Ikuti Sesi Training (Sebagai Peserta)
          </label>
          <form onSubmit={handleJoin} className="space-y-3">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-red-600 font-black text-base select-none">#</span>
              <input
                type="text"
                placeholder="Masukkan kode event (misal: TRAIN26)"
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase());
                  setError("");
                }}
                className="w-full pl-8 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white font-bold uppercase text-sm sm:text-base tracking-wide transition"
              />
            </div>
            {error && <p className="text-red-600 font-bold text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Masuk ke Sesi</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* 3 Main Pillars Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl text-left">
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl hover:border-blue-400 transition shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Peserta (Zero Login)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan QR code atau buka link. Tanya pertanyaan, upvote, dan jawab polling langsung dari HP tanpa perlu akun.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl hover:border-red-400 transition shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Layar Proyektor (Big Screen)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tampilan fullscreen 16:9 untuk proyektor/TV. Sorot pertanyaan terbaik dan animasi polling real-time.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl hover:border-slate-400 transition shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Kontrol Trainer (Moderasi)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review pertanyaan masuk, sorot pertanyaan ke proyektor dalam 1 klik, dan kendalikan sesi live quiz.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-5 px-6 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2 max-w-5xl mx-auto w-full">
        <span className="font-semibold text-slate-700">
          FJM InterAct • Aplikasi Interaksi Pelatihan & Rapat
        </span>
        <span>Hak Cipta © PT Fiqry Jaya Manunggal (FJM)</span>
      </footer>
    </div>
  );
}
