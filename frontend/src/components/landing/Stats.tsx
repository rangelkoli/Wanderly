import { motion } from "motion/react";

const stats = [
  {
    number: "10K+",
    label: "Trips Planned",
    sublabel: "AI-crafted itineraries delivered worldwide.",
  },
  {
    number: "95%",
    label: "Happy Travelers",
    sublabel: "Satisfaction rate from verified users.",
  },
  {
    number: "150+",
    label: "Destinations",
    sublabel: "Countries and cities covered by our AI.",
  },
];

export default function Stats() {
  return (
    <section id="stats" className="bg-lp-bg py-16 md:py-24">
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
              Stats & Facts
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-lp-text font-medium tracking-tight" style={{ fontFamily: "var(--font-body)" }}>
            Making an{" "}
            <span className="italic" style={{ fontFamily: "var(--font-display)" }}>
              impact
            </span>
          </h2>
          <p className="mt-3 text-sm md:text-base text-lp-muted max-w-lg" style={{ fontFamily: "var(--font-body)" }}>
            Wanderly is trusted by thousands of travelers around the globe. Our AI agents
            plan trips that are smarter, faster, and more personal than anything else.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1],
                delay: i * 0.12,
              }}
              viewport={{ once: true, margin: "-50px" }}
              className={`${
                i === 2 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Number */}
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-medium tracking-tighter text-lp-text mb-4"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {stat.number}
              </div>

              {/* Divider */}
              <div className="h-px bg-lp-stroke mb-4" />

              {/* Label */}
              <h3 className="text-xl md:text-2xl font-bold text-lp-text mb-1" style={{ fontFamily: "var(--font-body)" }}>
                {stat.label}
              </h3>
              <p className="text-sm text-lp-muted" style={{ fontFamily: "var(--font-body)" }}>
                {stat.sublabel}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
