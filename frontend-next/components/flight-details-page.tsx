"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, Plane, Clock, Calendar, Users, Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FlightOption } from "./flights-results-card";

interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  travel_class: string;
  selected_flight: FlightOption;
}

export default function FlightDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const flightData = useMemo(() => {
    const dataParam = searchParams.get("data");
    if (!dataParam) return null;
    
    try {
      return JSON.parse(decodeURIComponent(dataParam)) as FlightSearchParams;
    } catch {
      return null;
    }
  }, [searchParams]);

  if (!flightData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f7fbff_40%,#f8f9fb_100%)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Plane className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-lg font-semibold text-slate-900">No flight data found</p>
            <p className="mt-1 text-sm text-slate-500">Please search for flights first.</p>
            <Button onClick={() => router.push("/chat")} className="mt-4">
              Go to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { origin, destination, departure_date, return_date, adults, travel_class, selected_flight } = flightData;

  const generateGoogleFlightsUrl = () => {
    const baseUrl = "https://www.google.com/travel/flights";
    const params = new URLSearchParams({
      tfs: "CBwQAhoeEgoyMDI1LTAxLTAxagcIARIDTEFYcggIARIDSlRRAUgBcAGCAQsI_______________AZgBAQ",
      hl: "en",
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff_0%,#f7fbff_40%,#f8f9fb_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </button>

        <Card className="overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                  Selected Flight
                </p>
                <h1 className="mt-1 text-2xl font-bold text-white">
                  {origin} &rarr; {destination}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">${selected_flight.price}</p>
                <p className="text-xs text-white/80">Total price</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Plane className="h-7 w-7 text-cyan-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{selected_flight.airline}</p>
                  <p className="text-sm text-slate-500">{selected_flight.cabin}</p>
                </div>
              </div>
              <Button 
                className="bg-cyan-500 hover:bg-cyan-400"
                onClick={() => window.open(generateGoogleFlightsUrl(), "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Book on Google Flights
              </Button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Plane className="h-4 w-4" />
                  Departure
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{selected_flight.departure_time}</p>
                <p className="text-lg font-semibold text-slate-700">{selected_flight.departure_airport}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Plane className="h-4 w-4 rotate-90" />
                  Arrival
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{selected_flight.arrival_time}</p>
                <p className="text-lg font-semibold text-slate-700">{selected_flight.arrival_airport}</p>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Duration: {selected_flight.duration}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Plane className={`h-4 w-4 ${selected_flight.stops === 0 ? "text-emerald-600" : "text-slate-500"}`} />
                <span className={`text-sm font-medium ${selected_flight.stops === 0 ? "text-emerald-600" : "text-slate-700"}`}>
                  {selected_flight.stops === 0 ? "Nonstop" : `${selected_flight.stops} stop${selected_flight.stops > 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{departure_date}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Users className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{adults} passenger{adults > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {travel_class.charAt(0).toUpperCase() + travel_class.slice(1).replace("_", " ")}
                </span>
              </div>
            </div>

            {return_date && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Round trip: Return on {return_date}
                </p>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">
                This flight data is sourced from Google Flights. Prices and availability may change. 
                Click the button above to complete your booking on Google Flights.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
