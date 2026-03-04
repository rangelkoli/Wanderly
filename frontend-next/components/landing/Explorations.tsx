"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const explorations = [
  {
    id: 1,
    title: "Celestial Planets",
    category: "3D Visualization",
    image: "/explorations/planet.svg",
  },
  {
    id: 2,
    title: "ASCII Art Study",
    category: "Generative Art",
    image: "/explorations/ascii.svg",
  },
  {
    id: 3,
    title: "Atmospheric Smoke",
    category: "Visual Effects",
    image: "/explorations/smoke.svg",
  },
  {
    id: 4,
    title: "Abstract Cylinder",
    category: "3D Rendering",
    image: "/explorations/cylinder.svg",
  },
  {
    id: 5,
    title: "Organic Waves",
    category: "Motion Design",
    image: "/explorations/wave.svg",
  },
  {
    id: 6,
    title: "Geometric Cubes",
    category: "3D Composition",
    image: "/explorations/cubes.svg",
  },
];

export default function Explorations() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pin the center content
      if (contentRef.current) {
        ScrollTrigger.create({
          trigger: contentRef.current,
          start: "top top",
          end: "+=200vh",
          pin: true,
          pinSpacing: false,
        });
      }

      // Left column parallax
      if (leftColRef.current) {
        gsap.fromTo(
          leftColRef.current,
          { y: "10vh" },
          {
            y: "-120vh",
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          }
        );
      }

      // Right column parallax
      if (rightColRef.current) {
        gsap.fromTo(
          rightColRef.current,
          { y: "40vh" },
          {
            y: "-100vh",
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.5,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Close lightbox on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const leftItems = explorations.filter((_, i) => i % 2 === 0);
  const rightItems = explorations.filter((_, i) => i % 2 !== 0);

  return (
    <section
      id="explorations"
      ref={sectionRef}
      className="relative min-h-[300vh] bg-lp-bg"
    >
      {/* Layer 1: Pinned center content */}
      <div
        ref={contentRef}
        className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px bg-lp-stroke" />
          <span className="text-xs text-lp-muted uppercase tracking-[0.3em] font-body">
            Explorations
          </span>
        </div>
        <h2 className="text-3xl md:text-5xl lg:text-6xl text-lp-text font-medium tracking-tight mb-4 font-body">
          Visual <span className="italic font-display">playground</span>
        </h2>
        <p className="text-sm md:text-base text-lp-muted max-w-md mb-8 font-body">
          A space for creative experiments, motion studies, and visual
          explorations of travel destinations.
        </p>
        <a
          href="https://dribbble.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm text-lp-text border border-lp-stroke hover:border-transparent transition-all"
        >
          <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#ea4c89">
            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm6.6 4.63a8.5 8.5 0 011.87 5.27c-.27-.06-3-.6-5.75-.26a12.4 12.4 0 00-.37-.82c-.15-.3-.3-.6-.45-.87 3.03-1.24 4.4-3 4.7-3.32zM10 1.48c2.17 0 4.16.8 5.68 2.13-.26.28-1.5 1.94-4.4 3.04-1.37-2.53-2.9-4.6-3.13-4.91A8.54 8.54 0 0110 1.48zM6.68 2.37c.22.28 1.72 2.37 3.12 4.82-3.94 1.05-7.42 1.03-7.81 1.03a8.57 8.57 0 014.69-5.85zM1.47 10v-.26c.38.01 4.46.07 8.67-1.2.24.47.47.95.68 1.43-.1.03-.2.06-.3.1-4.43 1.43-6.78 5.33-7.08 5.83A8.46 8.46 0 011.47 10zm3.2 6.84c.2-.35 1.96-3.26 5.84-4.97.06-.02.12-.04.18-.05a34.6 34.6 0 011.56 5.55A8.5 8.5 0 0110 18.52a8.47 8.47 0 01-5.33-1.68zm7.17.93a34.7 34.7 0 00-1.45-5.2c2.5-.4 4.7.26 4.98.35a8.54 8.54 0 01-3.53 4.85z" />
          </svg>
          View on Dribbble
          <span className="text-xs">&#8599;</span>
        </a>
      </div>

      {/* Layer 2: Parallax columns */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 gap-12 md:gap-40 px-6 md:px-10">
          {/* Left column */}
          <div ref={leftColRef} className="flex flex-col items-end">
            <div className="h-[20vh]" />
            {leftItems.map((item) => (
              <ExplorationCard
                key={item.id}
                item={item}
                onClick={() => setLightboxImage(item.image)}
              />
            ))}
          </div>

          {/* Right column */}
          <div ref={rightColRef} className="flex flex-col items-start">
            <div className="h-[40vh]" />
            {rightItems.map((item) => (
              <ExplorationCard
                key={item.id}
                item={item}
                onClick={() => setLightboxImage(item.image)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[80vh] w-[800px] h-[500px]"
            >
              <Image
                src={lightboxImage}
                alt=""
                fill
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ExplorationCard({
  item,
  onClick,
}: {
  item: (typeof explorations)[0];
  onClick: () => void;
}) {
  const rotation = (item.id % 2 === 0 ? 1 : -1) * (1.5 + (item.id % 3));

  return (
    <div
      className="relative aspect-square max-w-[320px] w-full mb-12 pointer-events-auto cursor-pointer group"
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={onClick}
    >
      {/* Outer frame */}
      <div className="absolute -inset-4 rounded-[40px] border border-lp-stroke/30" />

      {/* Image */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden border border-lp-stroke bg-lp-surface">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover"
        />
        {/* Blue tint */}
        <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay" />
        {/* Halftone */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-lp-bg/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
          <h4 className="text-lp-text text-base font-medium mb-1 font-body">
            {item.title}
          </h4>
          <p className="text-lp-muted text-xs font-body">{item.category}</p>
        </div>
      </div>
    </div>
  );
}
