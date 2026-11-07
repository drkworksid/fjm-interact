"use client";

import { useEffect, useState, useRef } from "react";
import { Lock, ArrowLeft, KeyRound, Delete, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface TrainerPinGateProps {
  children: React.ReactNode;
  eventCode?: string;
  eventTitle?: string;
}

export default function TrainerPinGate({ children, eventCode, eventTitle }: TrainerPinGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isShake, setIsShake] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check auth status on load
  const checkAuth = async () => {
    try {
      const url = eventCode
        ? `/api/auth/pin?eventCode=${encodeURIComponent(eventCode)}`
        : "/api/auth/pin";
      const res = await fetch(url);
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        setIsAdmin(Boolean(data.isAdmin));
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [eventCode]);

  // Auto focus first pin input once loaded
  useEffect(() => {
    if (isAuthenticated === false) {
      inputRefs.current[0]?.focus();
    }
  }, [isAuthenticated]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    setErrorMsg("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits filled
    if (digit && index === 5) {
      const fullPin = newDigits.join("");
      if (fullPin.length === 6) {
        verifyPin(fullPin);
      }
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!pinDigits[index] && index > 0) {
        const newDigits = [...pinDigits];
        newDigits[index - 1] = "";
        setPinDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...pinDigits];
        newDigits[index] = "";
        setPinDigits(newDigits);
      }
    }
  };

  // Handle paste full 6-digit PIN
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setPinDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();

      if (pasted.length === 6) {
        verifyPin(pasted);
      }
    }
  };

  // On-screen keypad click
  const handleKeypadClick = (val: string) => {
    if (val === "CLEAR") {
      setPinDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    if (val === "BACKSPACE") {
      const lastFilledIndex = pinDigits.map((d, i) => (d ? i : -1)).filter((i) => i !== -1).pop();
      if (lastFilledIndex !== undefined && lastFilledIndex >= 0) {
        const newDigits = [...pinDigits];
        newDigits[lastFilledIndex] = "";
        setPinDigits(newDigits);
        inputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    // Number digit
    const firstEmptyIndex = pinDigits.findIndex((d) => !d);
    if (firstEmptyIndex !== -1) {
      handleDigitChange(firstEmptyIndex, val);
    }
  };

  // Send PIN verification to server
  const verifyPin = async (fullPin: string) => {
    setIsVerifying(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: fullPin,
          eventCode: eventCode || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setIsAdmin(Boolean(data.isAdmin));
      } else {
        setErrorMsg(data.error || "PIN salah. Silakan coba lagi.");
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        setPinDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (e: any) {
      setErrorMsg("Gagal memverifikasi PIN. Periksa koneksi internet.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500">Memeriksa izin akses trainer...</p>
      </div>
    );
  }

  // Already authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Locked PIN Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 font-sans select-none">
      {/* Top back button */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <Link
          href={eventCode ? "/dashboard" : "/"}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 transition px-3 py-1.5 rounded-xl hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{eventCode ? "Ke Dashboard" : "Kembali ke Beranda"}</span>
        </Link>
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          FJM Security
        </span>
      </div>

      {/* Main Lock Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/60 text-center my-auto">
        {/* Logo and Lock icon */}
        <div className="flex justify-center items-center gap-2 mb-4">
          <img src="/fjm-logo.png" alt="FJM Logo" className="h-10 w-auto object-contain" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3 shadow-xs">
          <KeyRound className="w-3.5 h-3.5" />
          <span>
            {eventCode ? `Akses Trainer Sesi #${eventCode}` : "Akses Khusus Trainer & Admin"}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1.5">
          {eventCode ? `Verifikasi PIN Sesi #${eventCode}` : "Verifikasi PIN Keamanan"}
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed">
          {eventCode ? (
            <>
              Masukkan 6 angka PIN khusus trainer untuk sesi{" "}
              <strong className="text-slate-800">#{eventCode}</strong>
              {eventTitle ? ` (${eventTitle})` : ""} atau Master PIN Admin.
            </>
          ) : (
            "Masukkan 6 angka PIN trainer untuk membuka Dashboard dan mengelola sesi interaksi."
          )}
        </p>

        {/* 6 Digit Inputs */}
        <div
          onPaste={handlePaste}
          className={`flex items-center justify-center gap-2 sm:gap-2.5 mb-4 ${
            isShake ? "animate-bounce ring-2 ring-red-400 rounded-2xl p-1" : ""
          }`}
        >
          {pinDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isVerifying}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all focus:outline-none ${
                digit
                  ? "border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm"
                  : "border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white"
              }`}
            />
          ))}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={() => verifyPin(pinDigits.join(""))}
          disabled={pinDigits.join("").length !== 6 || isVerifying}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition cursor-pointer flex items-center justify-center gap-2 mb-4"
        >
          <Lock className="w-4 h-4" />
          <span>{isVerifying ? "Memverifikasi PIN..." : "Buka Akses Trainer"}</span>
        </button>

        {/* Default hint for user */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            PIN Bawaan Awal: <strong className="font-mono text-blue-700 font-black">262626</strong>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {eventCode
              ? "Gunakan PIN khusus sesi ini atau Master PIN Admin."
              : "Dapat diubah kapan saja di menu Pengaturan Dashboard."}
          </p>
        </div>

        {/* On-screen numeric keypad for mobile/touch users */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "BACKSPACE"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKeypadClick(k)}
                className={`py-2.5 rounded-xl font-bold text-sm transition active:scale-95 flex items-center justify-center ${
                  k === "CLEAR"
                    ? "bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs"
                    : k === "BACKSPACE"
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 text-base"
                }`}
              >
                {k === "CLEAR" ? "Hapus" : k === "BACKSPACE" ? <Delete className="w-4 h-4" /> : k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-2">
        <span>FJM InterAct Security • PT Fiqry Jaya Manunggal</span>
      </footer>
    </div>
  );
}
