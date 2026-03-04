import { Suspense } from "react";
import FlightDetailsPage from "@/components/flight-details-page";

export default function FlightDetailsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-slate-500">Loading flight details...</div>
        </div>
      }
    >
      <FlightDetailsPage />
    </Suspense>
  );
}
