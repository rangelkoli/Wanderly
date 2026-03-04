import { motion } from "motion/react";

const projects = [
  {
    slug: "ai-itinerary",
    title: "AI Itinerary Builder",
    image: "/projects/wireframe.svg",
    gradient: "from-violet-500 via-fuchsia-400/60 via-indigo-500/60 to-transparent",
    description: "Intelligent day-by-day trip planning with real-time maps and coordinates.",
  },
  {
    slug: "destination-explorer",
    title: "Destination Explorer",
    image: "/projects/building.svg",
    gradient: "from-sky-500 via-blue-400/60 to-transparent",
    description: "Discover hidden gems and iconic landmarks powered by AI curation.",
  },
  {
    slug: "traveler-profiles",
    title: "Traveler Profiles",
    image: "/projects/person.svg",
    gradient: "from-emerald-500 via-emerald-300/60 via-teal-500/60 to-transparent",
    description: "Personalized trip recommendations based on your travel style.",
  },
  {
    slug: "brand-experience",
    title: "Brand Experience",
    image: "/projects/branding.svg",
    gradient: "from-amber-500 via-amber-300/60 via-orange-500/60 to-transparent",
    description: "Seamless travel planning with a premium, minimal interface.",
  },
];

const containerVariant = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function SelectedWorks() {
  return (
    <section id="works" className="bg-lp-bg py-12 md:py-16">
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
            <span
              className="text-xs text-lp-muted uppercase tracking-[0.3em]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              How It Works
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-lp-text font-medium tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
                Featured{" "}
                <span className="italic" style={{ fontFamily: "var(--font-display)" }}>
                  capabilities
                </span>
              </h2>
              <p className="mt-3 text-sm md:text-base text-lp-muted max-w-lg" style={{ fontFamily: "var(--font-body)" }}>
                From dream to departure -- AI-powered tools that handle every detail of your journey.
              </p>
            </div>
            <a
              href="/login"
              className="hidden md:inline-flex group relative items-center gap-2 rounded-full text-sm px-6 py-3 text-lp-text border border-lp-stroke hover:border-transparent transition-all"
            >
              <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              <span className="relative flex items-center gap-2 bg-lp-bg rounded-full">
                Start planning
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6"
        >
          {projects.map((project, i) => (
            <motion.div
              key={project.slug}
              variants={cardVariant}
              className={`group relative overflow-hidden rounded-3xl border border-lp-stroke bg-lp-surface cursor-pointer ${
                i % 2 === 0 ? "md:col-span-7" : "md:col-span-5"
              }`}
              style={{ aspectRatio: i === 1 || i === 2 ? undefined : "4/3" }}
            >
              {/* Background Image */}
              <img
                src={project.image}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Halftone overlay */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-multiply"
                style={{
                  backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                  backgroundSize: "4px 4px",
                }}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-lp-bg/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="relative">
                  <span className="absolute inset-[-2px] rounded-full accent-gradient animate-gradient-shift" />
                  <span className="relative flex items-center gap-2 rounded-full bg-white text-lp-bg px-5 py-2.5 text-sm font-medium">
                    View —{" "}
                    <span className="italic" style={{ fontFamily: "var(--font-display)" }}>
                      {project.title}
                    </span>
                  </span>
                </div>
              </div>

              {/* Bottom gradient label */}
              <div className={`absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t ${project.gradient} opacity-40`} />
              <div className="absolute bottom-4 left-5 right-5 z-10">
                <h3
                  className="text-lg md:text-xl font-medium text-white mb-1"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {project.title}
                </h3>
                <p className="text-xs text-white/60" style={{ fontFamily: "var(--font-body)" }}>
                  {project.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
