import { motion } from "motion/react";

const journalEntries = [
  {
    title: "The Future of AI-Powered Travel in 2026",
    image: "/explorations/planet.svg",
    readTime: "6 min read",
    date: "Feb 13, 2026",
  },
  {
    title: "How We Plan Trips for the Next Billion Travelers",
    image: "/explorations/cubes.svg",
    readTime: "5 min read",
    date: "Feb 06, 2026",
  },
  {
    title: "The Psychology of Wanderlust and Trip Planning",
    image: "/explorations/ascii.svg",
    readTime: "6 min read",
    date: "Feb 03, 2026",
  },
  {
    title: "Why Personalized Itineraries Beat Generic Guides",
    image: "/explorations/smoke.svg",
    readTime: "5 min read",
    date: "Jan 31, 2026",
  },
];

export default function Journal() {
  return (
    <section id="journal" className="bg-lp-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-10 md:mb-14"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-lp-stroke" />
            <span className="text-xs text-lp-muted uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-body)" }}>
              Travel Journal
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-lp-text font-medium tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
                Recent{" "}
                <span className="italic" style={{ fontFamily: "var(--font-display)" }}>
                  thoughts
                </span>
              </h2>
              <p className="mt-3 text-sm md:text-base text-lp-muted max-w-lg" style={{ fontFamily: "var(--font-body)" }}>
                Insights on travel, AI, and the future of exploration.
              </p>
            </div>
            <button className="hidden md:inline-flex group relative items-center gap-2 rounded-full text-sm px-6 py-3 text-lp-text border border-lp-stroke hover:border-transparent transition-all">
              <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              <span className="relative flex items-center gap-2">
                View all
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
          </div>
        </motion.div>

        {/* Journal Entries */}
        <div className="flex flex-col gap-4">
          {journalEntries.map((entry, i) => (
            <motion.a
              key={entry.title}
              href="#"
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.25, 0.1, 0.25, 1],
                delay: i * 0.08,
              }}
              viewport={{ once: true, margin: "-50px" }}
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 rounded-[20px] sm:rounded-full bg-lp-surface/30 hover:bg-lp-surface border border-lp-stroke transition-all"
            >
              {/* Circular image */}
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] flex-shrink-0 rounded-full overflow-hidden border border-lp-stroke group-hover:border-lp-muted transition-all">
                <img
                  src={entry.image}
                  alt={entry.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>

              {/* Title */}
              <h3
                className="text-base sm:text-lg md:text-2xl font-medium text-lp-text transition-transform group-hover:translate-x-1 flex-shrink-0"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {entry.title}
              </h3>

              {/* Dotted separator (desktop) */}
              <div className="hidden md:block flex-grow h-px bg-lp-stroke/30" />

              {/* Meta */}
              <div className="flex items-center gap-3 text-sm text-lp-muted flex-shrink-0" style={{ fontFamily: "var(--font-body)" }}>
                <span>{entry.readTime}</span>
                <span className="w-1 h-1 rounded-full bg-lp-muted" />
                <span>{entry.date}</span>
              </div>

              {/* Arrow */}
              <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full border border-lp-stroke flex-shrink-0 transition-all group-hover:bg-lp-text group-hover:text-lp-bg group-hover:border-lp-text">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
