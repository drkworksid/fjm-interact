"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, X, Shield, Users, Heart, Sliders, Check } from "lucide-react";

interface IdeasPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (poll: any) => void;
  eventCode: string;
  initialData?: any;
}

export default function IdeasPollModal({
  isOpen,
  onClose,
  onSuccess,
  eventCode,
  initialData,
}: IdeasPollModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [question, setQuestion] = useState(initialData?.question || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [allowAnonymous, setAllowAnonymous] = useState(initialData?.allowAnonymous ?? true);
  const [allowReactions, setAllowReactions] = useState(initialData?.allowReactions ?? true);
  const [allowParticipantsToSeeIdeas, setAllowParticipantsToSeeIdeas] = useState(
    initialData?.allowParticipantsToSeeIdeas ?? true
  );
  const [moderationEnabled, setModerationEnabled] = useState(initialData?.moderationEnabled ?? false);
  const [maxIdeasPerParticipant, setMaxIdeasPerParticipant] = useState(
    initialData?.maxIdeasPerParticipant || 5
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setQuestion(initialData.question || "");
      setDescription(initialData.description || "");
      setAllowAnonymous(initialData.allowAnonymous ?? true);
      setAllowReactions(initialData.allowReactions ?? true);
      setAllowParticipantsToSeeIdeas(initialData.allowParticipantsToSeeIdeas ?? true);
      setModerationEnabled(initialData.moderationEnabled ?? false);
      setMaxIdeasPerParticipant(initialData.maxIdeasPerParticipant || 5);
    } else {
      setTitle("");
      setQuestion("");
      setDescription("");
      setAllowAnonymous(true);
      setAllowReactions(true);
      setAllowParticipantsToSeeIdeas(true);
      setModerationEnabled(false);
      setMaxIdeasPerParticipant(5);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim()) {
      setError("Judul dan pertanyaan ide wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = initialData?.id ? `/api/ideas-polls/${initialData.id}` : "/api/ideas-polls";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          title: title.trim(),
          question: question.trim(),
          description: description.trim() || null,
          allowAnonymous,
          allowReactions,
          allowParticipantsToSeeIdeas,
          moderationEnabled,
          maxIdeasPerParticipant: Number(maxIdeasPerParticipant),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Gagal menyimpan Ideas Poll");
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.poll);
      onClose();
    } catch (err: any) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialData ? "Edit Polling Ide (Ideas)" : "Buat Sesi Ide Baru (Ideas)"}
              </h3>
              <p className="text-xs text-slate-500">
                Kumpulkan saran, inovasi, dan gagasan peserta pelatihan secara interaktif.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Judul Sesi Ide *
            </label>
            <input
              type="text"
              placeholder="Contoh: Brainstorming Peningkatan Layanan Nasabah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Pertanyaan / Topik Pemantik Gagasan *
            </label>
            <input
              type="text"
              placeholder="Contoh: Apa ide terobosan Anda untuk mempercepat proses klaim?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Deskripsi atau Petunjuk Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan ruang lingkup, latar belakang masalah, atau format yang diinginkan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
            />
          </div>

          {/* Pengaturan Interaksi */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Pengaturan Partisipasi & Kontrol
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Moderasi Gagasan</span>
                    <span className="text-[11px] text-slate-500">
                      Ide peserta berstatus &quot;Pending&quot; sampai disetujui oleh trainer.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={moderationEnabled}
                  onChange={(e) => setModerationEnabled(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Izinkan Reaksi / Upvote</span>
                    <span className="text-[11px] text-slate-500">
                      Peserta dapat menyukai ide yang diusulkan oleh peserta lain.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowReactions}
                  onChange={(e) => setAllowReactions(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Peserta Dapat Melihat Ide Lain</span>
                    <span className="text-[11px] text-slate-500">
                      Jika dinonaktifkan, peserta hanya melihat ide yang mereka kirim sendiri.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowParticipantsToSeeIdeas}
                  onChange={(e) => setAllowParticipantsToSeeIdeas(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Izinkan Kirim Anonim</span>
                  <span className="text-[11px] text-slate-500">Peserta dapat menyembunyikan nama mereka.</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowAnonymous}
                  onChange={(e) => setAllowAnonymous(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Batas Maksimal Ide per Peserta
            </label>
            <div className="flex items-center gap-2">
              {[1, 3, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxIdeasPerParticipant(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    maxIdeasPerParticipant === num
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {num} Ide
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Sesi Ide"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
