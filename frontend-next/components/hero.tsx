import { TripPlannerInput } from "./trip-planner-input";

export function Hero() {
  return (
    <section className="relative w-full flex flex-col items-center justify-center px-4 py-24 sm:py-32">
      {/* Background decorative element */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 size-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <h1 className="text-balance text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        Where do you want to go?
      </h1>
      <p className="text-pretty mt-4 max-w-xl text-center text-base text-muted-foreground sm:text-lg">
        Let AI craft your perfect itinerary. Just describe the trip you have in
        mind and we will handle the rest.
      </p>

      <div className="mt-10 w-full flex justify-center">
        <TripPlannerInput />
      </div>

      {/* Social proof hint */}
      <p className="mt-8 text-xs text-muted-foreground">
        Over 10,000 trips planned and counting
      </p>
    </section>
  );
}
