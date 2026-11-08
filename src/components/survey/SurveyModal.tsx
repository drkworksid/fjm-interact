"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Plus, Trash2, ArrowUp, ArrowDown, X, Check, HelpCircle, Settings } from "lucide-react";
import { Survey } from "@/lib/types/interaction";

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (survey: any) => void;
  eventCode: string;
  initialData?: Survey | null;
}

export default function SurveyModal({
  isOpen,
  onClose,
  onSuccess,
  eventCode,
  initialData,
}: SurveyModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [allowAnonymous, setAllowAnonymous] = useState(initialData?.allowAnonymous ?? true);
  const [showProgress, setShowProgress] = useState(initialData?.showProgress ?? true);
  const [allowBackNavigation, setAllowBackNavigation] = useState(initialData?.allowBackNavigation ?? true);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | "">(initialData?.timeLimitSeconds || "");
  const [showResultsAfterSubmit, setShowResultsAfterSubmit] = useState(
    initialData?.showResultsAfterSubmit ?? false
  );

  // Questions state
  const [questions, setQuestions] = useState<any[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions.map((q) => ({
          type: q.type,
          question: q.question,
          description: q.description || "",
          required: q.required,
          options: q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) : ["Opsi 1", "Opsi 2"],
        }))
      : [
          {
            type: "MULTIPLE_CHOICE",
            question: "Bagaimana tingkat kepuasan materi sesi ini?",
            description: "",
            required: true,
            options: ["Sangat Puas", "Puas", "Cukup", "Perlu Peningkatan"],
          },
          {
            type: "RATING",
            question: "Beri nilai pemahaman Anda (skala 1-5 bintang)",
            description: "",
            required: true,
            options: [],
          },
          {
            type: "OPEN_TEXT",
            question: "Apa saran perbaikan Anda untuk sesi berikutnya?",
            description: "",
            required: false,
            options: [],
          },
        ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setAllowAnonymous(initialData.allowAnonymous ?? true);
      setShowProgress(initialData.showProgress ?? true);
      setAllowBackNavigation(initialData.allowBackNavigation ?? true);
      setTimeLimitSeconds(initialData.timeLimitSeconds || "");
      setShowResultsAfterSubmit(initialData.showResultsAfterSubmit ?? false);
      if (initialData.questions) {
        setQuestions(
          initialData.questions.map((q) => ({
            type: q.type,
            question: q.question,
            description: q.description || "",
            required: q.required,
            options: q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) : [],
          }))
        );
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddQuestion = (type: string) => {
    setQuestions([
      ...questions,
      {
        type,
        question: `Pertanyaan baru #${questions.length + 1}`,
        description: "",
        required: true,
        options: type === "MULTIPLE_CHOICE" || type === "RANKING" ? ["Opsi A", "Opsi B", "Opsi C"] : [],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul survei wajib diisi.");
      return;
    }

    if (questions.length === 0) {
      setError("Survei harus memiliki minimal 1 pertanyaan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = initialData?.id ? `/api/surveys/${initialData.id}` : "/api/surveys";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          title: title.trim(),
          description: description.trim() || null,
          allowAnonymous,
          showProgress,
          allowBackNavigation,
          timeLimitSeconds: timeLimitSeconds ? Number(timeLimitSeconds) : null,
          showResultsAfterSubmit,
          questions,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Gagal menyimpan survei");
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.survey);
      onClose();
    } catch (err: any) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialData ? "Edit Survei Multi-Pertanyaan" : "Buat Survei Baru (Survey Container)"}
              </h3>
              <p className="text-xs text-slate-500">
                Gabungkan berbagai tipe pertanyaan (Pilihan Ganda, Rating, Word Cloud, Teks, Ranking) dalam satu alur.
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
              Judul Survei *
            </label>
            <input
              type="text"
              placeholder="Contoh: Evaluasi Pelatihan & Survei Kepuasan Peserta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Deskripsi Pengantar Survei (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Berikan sambutan atau estimasi waktu pengerjaan (misal: 'Hanya membutuhkan waktu 2 menit')..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
            />
          </div>

          {/* Daftar Pertanyaan */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Daftar Pertanyaan ({questions.length} item)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-1">+ Tambah:</span>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("MULTIPLE_CHOICE")}
                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold"
                >
                  Pilihan Ganda
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("RATING")}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold"
                >
                  Rating
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("OPEN_TEXT")}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold"
                >
                  Teks Terbuka
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("WORD_CLOUD")}
                  className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold"
                >
                  Word Cloud
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("RANKING")}
                  className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold"
                >
                  Ranking
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => {
                            const copy = [...questions];
                            copy[idx].required = e.target.checked;
                            setQuestions(copy);
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded-sm"
                        />
                        <span>Wajib Dijawab</span>
                      </label>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => {
                      const copy = [...questions];
                      copy[idx].question = e.target.value;
                      setQuestions(copy);
                    }}
                    placeholder={`Tulis pertanyaan #${idx + 1}...`}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {/* Options editor for Multiple Choice or Ranking */}
                  {(q.type === "MULTIPLE_CHOICE" || q.type === "RANKING") && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Pilihan Jawaban (pisahkan dengan koma):
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(q.options) ? q.options.join(", ") : ""}
                        onChange={(e) => {
                          const copy = [...questions];
                          copy[idx].options = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setQuestions(copy);
                        }}
                        placeholder="Opsi 1, Opsi 2, Opsi 3"
                        className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pengaturan Survei */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
              Fitur Navigasi & Tampilan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Tampilkan Progress Bar</span>
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Izinkan Tombol Kembali (Back)</span>
                <input
                  type="checkbox"
                  checked={allowBackNavigation}
                  onChange={(e) => setAllowBackNavigation(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Izinkan Respon Anonim</span>
                <input
                  type="checkbox"
                  checked={allowAnonymous}
                  onChange={(e) => setAllowAnonymous(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Tampilkan Hasil Setelah Submit</span>
                <input
                  type="checkbox"
                  checked={showResultsAfterSubmit}
                  onChange={(e) => setShowResultsAfterSubmit(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-sm"
                />
              </label>
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Survei"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

