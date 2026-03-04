"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import Hls from "hls.js";
import gsap from "gsap";
import Link from "next/link";

const HLS_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

const NAV_LINKS = ["Home", "Features", "Destinations"] as const;
const ROLES = ["Explore", "Discover", "Create", "Journey"];

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const [activeNav, setActiveNav] = useState<string>("Home");
  const [scrolled, setScrolled] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);

  // HLS video setup
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

  // Scroll listener for navbar shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Role cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".name-reveal",
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }
      );
      tl.fromTo(
        ".blur-in",
        { opacity: 0, filter: "blur(10px)", y: 20 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 },
        "-=0.8"
      );
    }, heroContentRef);
    return () => ctx.revert();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-lp-bg to-transparent" />
      </div>

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4 transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-black/10" : ""
        }`}
      >
        <div className="inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-lp-surface px-2 py-2">
          {/* Logo */}
          <button
            onClick={() => scrollToSection("hero")}
            className="group relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110"
          >
            <div className="absolute inset-0 rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full bg-lp-bg">
              <span className="italic text-[13px] text-lp-text font-display">
                W
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-lp-stroke mx-1" />

          {/* Nav links */}
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              onClick={() => {
                setActiveNav(link);
                scrollToSection(
                  link === "Home"
                    ? "hero"
                    : link === "Features"
                      ? "works"
                      : "explorations"
                );
              }}
              className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-all font-body ${
                activeNav === link
                  ? "text-lp-text bg-lp-stroke/50"
                  : "text-lp-muted hover:text-lp-text hover:bg-lp-stroke/50"
              }`}
            >
              {link}
            </button>
          ))}

          {/* Divider */}
          <div className="hidden sm:block w-px h-5 bg-lp-stroke mx-1" />

          {/* Start Planning button */}
          <button
            onClick={() => scrollToSection("contact")}
            className="group relative text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-lp-text transition-all"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-1.5 rounded-full bg-lp-surface backdrop-blur-md px-3 py-1.5">
              Start Planning
              <span className="text-xs">&#8599;</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <div
        ref={heroContentRef}
        className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4"
      >
        {/* Eyebrow */}
        <span className="blur-in text-xs text-lp-muted uppercase tracking-[0.3em] mb-8 font-body">
          AI-POWERED TRAVEL &apos;26
        </span>

        {/* Title */}
        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl italic leading-[0.9] tracking-tight text-lp-text mb-6 font-display">
          Wanderly
        </h1>

        {/* Role line */}
        <p className="blur-in text-base md:text-lg text-lp-muted mb-4 font-body">
          Dream it. Describe it.{" "}
          <span
            key={roleIndex}
            className="italic text-lp-text animate-role-fade-in inline-block font-display"
          >
            {ROLES[roleIndex]}
          </span>{" "}
          it.
        </p>

        {/* Description */}
        <p className="blur-in text-sm md:text-base text-lp-muted max-w-md mb-12 font-body">
          Your personal AI travel concierge. Describe your dream trip and let
          intelligent agents craft the perfect itinerary with flights, places,
          and maps.
        </p>

        {/* CTA Buttons */}
        <div className="blur-in inline-flex gap-4">
          <Link
            href="/auth/sign-up"
            className="group relative rounded-full text-sm px-7 py-3.5 bg-lp-text text-lp-bg font-medium transition-all hover:scale-105 hover:bg-lp-bg hover:text-lp-text"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            Plan a Trip
          </Link>
          <button
            onClick={() => scrollToSection("works")}
            className="group relative rounded-full text-sm px-7 py-3.5 border-2 border-lp-stroke bg-lp-bg text-lp-text font-medium transition-all hover:scale-105 hover:border-transparent"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            See How It Works
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        <span className="text-xs text-lp-muted uppercase tracking-[0.2em] mb-3 font-body">
          SCROLL
        </span>
        <div className="relative w-px h-10 bg-lp-stroke overflow-hidden">
          <div className="absolute w-full h-2 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
