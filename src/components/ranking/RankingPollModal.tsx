"use client";

import React, { useState, useEffect } from "react";
import { Award, Plus, Trash2, ArrowUp, ArrowDown, X, Check, Sliders, Shuffle } from "lucide-react";
import { RankingPoll } from "@/lib/types/interaction";

interface RankingPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (poll: any) => void;
  eventCode: string;
  initialData?: RankingPoll | null;
}

export default function RankingPollModal({
  isOpen,
  onClose,
  onSuccess,
  eventCode,
  initialData,
}: RankingPollModalProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [question, setQuestion] = useState(initialData?.question || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [options, setOptions] = useState<string[]>(
    initialData?.options ? initialData.options.map((o) => o.label) : ["Pilihan 1", "Pilihan 2", "Pilihan 3"]
  );
  const [minRankItems, setMinRankItems] = useState<number>(initialData?.minRankItems || 1);
  const [maxRankItems, setMaxRankItems] = useState<number>(initialData?.maxRankItems || 3);
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(initialData?.randomizeOptions ?? false);
  const [showResultsToParticipants, setShowResultsToParticipants] = useState<boolean>(
    initialData?.showResultsToParticipants ?? true
  );
  const [allowAnonymous, setAllowAnonymous] = useState<boolean>(initialData?.allowAnonymous ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setQuestion(initialData.question || "");
      setDescription(initialData.description || "");
      setOptions(initialData.options ? initialData.options.map((o) => o.label) : ["Pilihan 1", "Pilihan 2", "Pilihan 3"]);
      setMinRankItems(initialData.minRankItems || 1);
      setMaxRankItems(initialData.maxRankItems || (initialData.options?.length || 3));
      setRandomizeOptions(initialData.randomizeOptions ?? false);
      setShowResultsToParticipants(initialData.showResultsToParticipants ?? true);
      setAllowAnonymous(initialData.allowAnonymous ?? true);
    } else {
      setTitle("");
      setQuestion("");
      setDescription("");
      setOptions(["Pilihan 1", "Pilihan 2", "Pilihan 3"]);
      setMinRankItems(1);
      setMaxRankItems(3);
      setRandomizeOptions(false);
      setShowResultsToParticipants(true);
      setAllowAnonymous(true);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, `Pilihan ${options.length + 1}`]);
    setMaxRankItems((prev) => Math.max(prev, options.length + 1));
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (maxRankItems > next.length) setMaxRankItems(next.length);
    if (minRankItems > next.length) setMinRankItems(next.length);
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const copy = [...options];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setOptions(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim()) {
      setError("Judul dan pertanyaan polling peringkat wajib diisi.");
      return;
    }

    const cleanOptions = options.filter((o) => o.trim().length > 0);
    if (cleanOptions.length < 2) {
      setError("Minimal harus ada 2 pilihan opsi yang valid.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = initialData?.id ? `/api/ranking-polls/${initialData.id}` : "/api/ranking-polls";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          title: title.trim(),
          question: question.trim(),
          description: description.trim() || null,
          options: cleanOptions,
          minRankItems: Number(minRankItems),
          maxRankItems: Number(maxRankItems),
          randomizeOptions,
          showResultsToParticipants,
          allowAnonymous,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Gagal menyimpan Polling Peringkat");
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.poll);
      onClose();
    } catch (err: any) {
      setError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialData ? "Edit Polling Peringkat" : "Buat Polling Peringkat (Ranking)"}
              </h3>
              <p className="text-xs text-slate-500">
                Peserta mengurutkan pilihan berdasarkan skala prioritas atau preferensi mereka.
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
              Topik / Judul Polling *
            </label>
            <input
              type="text"
              placeholder="Contoh: Prioritas Inisiatif Q3 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Pertanyaan untuk Peserta *
            </label>
            <input
              type="text"
              placeholder="Contoh: Urutkan inisiatif berikut dari yang paling mendesak menurut Anda:"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Deskripsi atau Petunjuk (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan kriteria penilaian (misal: efisiensi biaya, kemudahan implementasi)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>

          {/* Opsi Pilihan Ranking */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Pilihan Opsi yang Akan Diurutkan ({options.length} opsi)
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Opsi</span>
              </button>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center font-mono font-bold text-xs text-slate-400">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[idx] = e.target.value;
                      setOptions(copy);
                    }}
                    placeholder={`Opsi ${idx + 1}`}
                    required
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />

                  {/* Move Up/Down Controls */}
                  <button
                    type="button"
                    onClick={() => handleMoveOption(idx, "up")}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOption(idx, "down")}
                    disabled={idx === options.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Option */}
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pengaturan Batasan Ranking */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Minimal Pilihan Diurutkan
              </label>
              <input
                type="number"
                min={1}
                max={options.length}
                value={minRankItems}
                onChange={(e) => setMinRankItems(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Maksimal Pilihan Diurutkan
              </label>
              <input
                type="number"
                min={minRankItems}
                max={options.length}
                value={maxRankItems}
                onChange={(e) => setMaxRankItems(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Switch Toggles */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Acak Urutan Opsi (Randomize)</span>
                  <span className="text-[11px] text-slate-500">Mencegah bias pilihan teratas pada setiap peserta.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={randomizeOptions}
                onChange={(e) => setRandomizeOptions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Tampilkan Hasil ke Peserta</span>
                <span className="text-[11px] text-slate-500">Peserta dapat melihat skor akhir setelah submit.</span>
              </div>
              <input
                type="checkbox"
                checked={showResultsToParticipants}
                onChange={(e) => setShowResultsToParticipants(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Izinkan Respon Anonim</span>
                <span className="text-[11px] text-slate-500">Peserta dapat memilih untuk tidak menampilkan nama.</span>
              </div>
              <input
                type="checkbox"
                checked={allowAnonymous}
                onChange={(e) => setAllowAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
            </label>
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Polling Ranking"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
