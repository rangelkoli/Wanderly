"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";

interface LoadingScreenProps {
  onComplete: () => void;
}

const WORDS = ["Explore", "Discover", "Wander"];
const DURATION = 2700;

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      setTimeout(onComplete, 400);
    }
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % WORDS.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let rafId: number;
    const tick = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(Math.floor((elapsed / DURATION) * 100), 100);
      setCount(progress);
      if (progress >= 100) {
        handleComplete();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [handleComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-between"
      style={{ background: "hsl(0 0% 4%)" }}
    >
      {/* Top-left label */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-8 pt-8"
      >
        <span
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: "hsl(0 0% 53%)" }}
        >
          Wanderly
        </span>
      </motion.div>

      {/* Center rotating words */}
      <div className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-4xl md:text-6xl lg:text-7xl italic font-display"
            style={{ color: "hsl(0 0% 96% / 0.8)" }}
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-8 pb-8">
        {/* Counter - bottom right */}
        <div className="flex justify-end mb-4">
          <span
            className="text-6xl md:text-8xl lg:text-9xl tabular-nums font-display"
            style={{ color: "hsl(0 0% 96%)" }}
          >
            {String(count).padStart(3, "0")}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-[3px] w-full rounded-full"
          style={{ background: "hsl(0 0% 12% / 0.5)" }}
        >
          <div
            className="h-full accent-gradient rounded-full transition-transform duration-75"
            style={{
              transform: `scaleX(${count / 100})`,
              transformOrigin: "left",
              boxShadow: "0 0 8px rgba(137, 170, 204, 0.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
