"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import Hls from "hls.js";
import gsap from "gsap";
import Link from "next/link";

const HLS_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
const SOCIAL_LINKS = [
  { label: "Twitter", href: "https://twitter.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Dribbble", href: "https://dribbble.com" },
  { label: "GitHub", href: "https://github.com" },
];

const MARQUEE_TEXT = "PLAN YOUR NEXT ADVENTURE \u2022 ";

export default function ContactFooter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  // HLS video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_SRC;
    }
  }, []);

  // GSAP Marquee
  useEffect(() => {
    if (!marqueeRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="contact"
      className="relative bg-lp-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden"
    >
      {/* Background Video (flipped) */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
          style={{ transform: "translate(-50%, -50%) scaleY(-1)" }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-lp-bg to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-lp-bg to-transparent" />
      </div>

      <div className="relative z-10">
        {/* Marquee */}
        <div className="overflow-hidden mb-12 md:mb-16">
          <div
            ref={marqueeRef}
            className="whitespace-nowrap inline-flex"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="text-5xl md:text-7xl lg:text-8xl text-lp-text/10 mx-2 italic font-display"
              >
                {MARQUEE_TEXT}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-sm md:text-base text-lp-muted max-w-md mx-auto mb-8 font-body"
          >
            Have a trip in mind? Start planning your perfect journey with our AI
            concierge. It only takes a few seconds.
          </motion.p>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Link
              href="/auth/sign-up"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-lp-bg border-2 border-lp-stroke rounded-full text-lp-text text-base font-medium transition-all hover:border-transparent"
            >
              <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              Start Planning Now
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <path
                  d="M4 12L12 4M12 4H6M12 4v6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </motion.div>
        </div>

        {/* Footer Bar */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="border-t border-lp-stroke pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social links */}
            <div className="flex items-center gap-6">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-lp-muted hover:text-lp-text transition-all hover:-translate-y-0.5 font-body"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-xs text-lp-muted font-body">
              &copy; 2026 Wanderly. All rights reserved.
            </p>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-sm text-lp-muted font-body">
                AI Concierge Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
