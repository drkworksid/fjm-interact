"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Star,
  Lock,
  AlertCircle,
  HelpCircle,
  Award
} from "lucide-react";
import { Survey, SurveyQuestion } from "@/lib/types/interaction";

interface ParticipantSurveyViewProps {
  survey: Survey;
  voterToken: string;
  participantName: string;
  isAnonymousDefault?: boolean;
}

export default function ParticipantSurveyView({
  survey,
  voterToken,
  participantName,
  isAnonymousDefault = false,
}: ParticipantSurveyViewProps) {
  const existingResponse = (survey.responses || []).find((r) => r.participantId === voterToken);
  const isCompleted = existingResponse?.completionStatus === "completed";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize existing answers if any
  useEffect(() => {
    if (existingResponse?.answers) {
      const map: Record<string, string> = {};
      for (const a of existingResponse.answers) {
        if (a.value !== null && a.value !== undefined) {
          map[a.questionId] = a.value;
        }
      }
      setAnswers(map);
    }
  }, [existingResponse]);

  const questions = survey.questions || [];
  const currentQuestion: SurveyQuestion | undefined = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  // Autosave progress to server
  const saveProgress = async (status: "in_progress" | "completed") => {
    try {
      const answersPayload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      await fetch(`/api/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: voterToken,
          participantName,
          isAnonymous,
          completionStatus: status,
          answers: answersPayload,
        }),
      });
    } catch (e) {
      console.error("Autosave error:", e);
    }
  };

  const handleAnswerChange = (questionId: string, val: string) => {
    if (isCompleted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Check required validation
    if (currentQuestion.required && !answers[currentQuestion.id]?.trim()) {
      setFeedback({
        type: "error",
        text: "Pertanyaan ini wajib dijawab sebelum lanjut ke pertanyaan berikutnya.",
      });
      return;
    }

    setFeedback(null);
    saveProgress("in_progress");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0 && survey.allowBackNavigation) {
      setFeedback(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitAll = async () => {
    if (isCompleted || isSubmitting) return;

    // Final validation: check all required questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.required && !answers[q.id]?.trim()) {
        setCurrentIndex(i);
        setFeedback({
          type: "error",
          text: `Pertanyaan no. ${i + 1} ("${q.question}") wajib dijawab.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const answersPayload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: voterToken,
          participantName,
          isAnonymous,
          completionStatus: "completed",
          answers: answersPayload,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", text: data.error || "Gagal mengirim survei" });
        setIsSubmitting(false);
        return;
      }

      setFeedback({
        type: "success",
        text: "Terima kasih! Seluruh jawaban survei Anda berhasil dikirim dan tersimpan permanen.",
      });
    } catch (e) {
      setFeedback({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <ClipboardList className="w-3 h-3 text-indigo-600" />
            <span>Survei Pelatihan</span>
          </span>
          <span className="text-xs text-slate-400 font-medium">
            • {questions.length} Pertanyaan
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-1">
          {survey.title}
        </h2>
        {survey.description && (
          <p className="text-xs text-slate-500 leading-relaxed mb-2">{survey.description}</p>
        )}

        {isCompleted ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 mt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Survei telah Anda selesaikan</span>
            </div>
            <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-black">
              Terkunci 🔒
            </span>
          </div>
        ) : (
          survey.status !== "active" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-800 flex items-center justify-center gap-2 mt-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Survei sedang tidak aktif atau telah ditutup oleh trainer.</span>
            </div>
          )
        )}
      </div>

      {/* Progress Bar */}
      {survey.showProgress && questions.length > 0 && !isCompleted && (
        <div className="space-y-1.5 px-1">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>
              Pertanyaan {currentIndex + 1} dari {questions.length}
            </span>
            <span className="text-indigo-600 font-mono">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Current Question Card */}
      {!isCompleted && currentQuestion && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {currentQuestion.type}
              </span>
              {currentQuestion.required && (
                <span className="text-[10px] font-bold text-red-500">* Wajib dijawab</span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {currentQuestion.question}
            </h3>
            {currentQuestion.description && (
              <p className="text-xs text-slate-500 mt-1">{currentQuestion.description}</p>
            )}
          </div>

          {/* Question Input Based on Type */}
          <div className="pt-2 border-t border-slate-100">
            {/* Multiple Choice */}
            {currentQuestion.type === "MULTIPLE_CHOICE" && (() => {
              let parsedOptions: string[] = [];
              try {
                parsedOptions = currentQuestion.options ? JSON.parse(currentQuestion.options) : [];
              } catch {
                parsedOptions = [];
              }

              return (
                <div className="space-y-2">
                  {parsedOptions.map((opt) => {
                    const isSelected = answers[currentQuestion.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                        className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-400"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Rating Stars (1-5) */}
            {currentQuestion.type === "RATING" && (
              <div className="text-center py-4 space-y-2">
                <p className="text-xs text-slate-500">Pilih skala bintang (1 = Rendah, 5 = Sangat Baik):</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const currentRating = parseInt(answers[currentQuestion.id] || "0", 10);
                    const isFilled = currentRating >= star;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, String(star))}
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition ${
                          isFilled
                            ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 scale-105"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        <Star className={`w-4 h-4 mb-0.5 ${isFilled ? "fill-current" : ""}`} />
                        <span>{star}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Open Text / Paragraph */}
            {currentQuestion.type === "OPEN_TEXT" && (
              <div>
                <textarea
                  rows={4}
                  placeholder="Ketik jawaban atau pendapat Anda di sini..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                />
              </div>
            )}

            {/* Word Cloud */}
            {currentQuestion.type === "WORD_CLOUD" && (
              <div>
                <input
                  type="text"
                  placeholder="Ketik 1-3 kata kunci..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {survey.allowBackNavigation && currentIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <div />
            )}

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Mengirimkan Survei..." : "Kirim Jawaban Survei"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
