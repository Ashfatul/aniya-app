"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const MESSAGES = [
  "Gathering precious moments…",
  "Opening your baby memory book…",
  "Wrapping sweet smiles in love…",
  "Loading Aniya's milestones…",
  "Cherishing the little things that matter…",
];

export function LoadingSplash({
  message,
  show = true,
}: {
  message?: string;
  show?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || MESSAGES[index];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fff8f5]/85 backdrop-blur-xl select-none transition-all duration-300 ease-out ${
        show
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute w-72 h-72 rounded-full bg-rose-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute w-60 h-60 rounded-full bg-amber-200/30 blur-3xl -translate-y-16 translate-x-16" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
        {/* Animated pulsating heart icon container */}
        <div className="relative flex items-center justify-center mb-5">
          {/* Ripple rings */}
          <div className="absolute w-24 h-24 rounded-full bg-rose-400/20 animate-ping opacity-60" />
          <div className="absolute w-20 h-20 rounded-full bg-rose-300/30 animate-pulse" />

          {/* Core icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E25C80] to-[#F59074] flex items-center justify-center shadow-lg shadow-rose-400/30">
            <Heart className="w-8 h-8 text-white fill-white animate-bounce" />
          </div>

          <span className="absolute -top-1 -right-1 text-2xl animate-spin-slow">
            🌸
          </span>
        </div>

        {/* Brand name */}
        <h2 className="font-script text-4xl sm:text-5xl font-bold text-[#E25C80] drop-shadow-xs">
          Aniya
        </h2>

        {/* Rotating sweet message */}
        <p
          key={activeMessage}
          className="mt-3 text-sm sm:text-base font-medium text-[var(--foreground)]/80 min-h-[1.75rem] transition-all duration-500 ease-in-out fade-up"
        >
          {activeMessage}
        </p>

        {/* Sleek animated progress bar */}
        <div className="w-36 h-1.5 bg-rose-100 rounded-full mt-4 overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#E25C80] to-[#F59074] rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
}
