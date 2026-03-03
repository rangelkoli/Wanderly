import { useState } from "react";
import { useNavigate } from "react-router";
import { Plane, Clock, ArrowRight, DollarSign, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface FlightOption {
  option_id?: number;
  id: string;
  price: number;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: number;
  cabin: string;
}

export interface FlightsResultsData {
  search_parameters: {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    adults: number;
    travel_class: string;
  };
  current_price: number;
  price_level: string;
  flights: FlightOption[];
}

interface FlightsResultsCardProps {
  data: FlightsResultsData;
  onSelectFlight?: (flight: FlightOption) => void;
  onConfirmFlight?: (flight: FlightOption) => void;
}

export default function FlightsResultsCard({ data, onSelectFlight, onConfirmFlight }: FlightsResultsCardProps) {
  const navigate = useNavigate();
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const { search_parameters, current_price, price_level, flights } = data;

  const handleSelectFlight = (flight: FlightOption) => {
    setSelectedFlightId(flight.id);
    
    if (onSelectFlight) {
      onSelectFlight(flight);
    }
  };

  const handleConfirmFlight = (flight: FlightOption) => {
    if (onConfirmFlight) {
      onConfirmFlight(flight);
    } else {
      const params = encodeURIComponent(
        JSON.stringify({
          ...search_parameters,
          selected_flight: flight,
        })
      );
      navigate(`/flights/details?data=${params}`);
    }
  };

  const getStopsLabel = (stops: number) => {
    if (stops === 0) return "Nonstop";
    if (stops === 1) return "1 stop";
    return `${stops} stops`;
  };

  const formatDuration = (duration: string) => {
    return duration || "N/A";
  };

  return (
    <div className="mx-auto my-6 w-full max-w-6xl rounded-3xl border border-sky-100 bg-[#f8fcff] p-4 shadow-[0_20px_48px_rgba(14,36,64,0.12)] md:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-600">
          Flight Search Results
        </p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          {search_parameters.origin} <ArrowRight className="inline h-5 w-5" /> {search_parameters.destination}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {search_parameters.departure_date}
          {search_parameters.return_date && ` - ${search_parameters.return_date}`}
          {" • "}
          {search_parameters.adults} {search_parameters.adults === 1 ? "passenger" : "passengers"}
          {" • "}
          {search_parameters.travel_class.charAt(0).toUpperCase() + search_parameters.travel_class.slice(1).replace("_", " ")}
        </p>
        <div className="mt-2 flex items-center gap-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            <DollarSign className="h-3 w-3" />
            Current best: ${current_price}
          </span>
          <span className="text-xs text-slate-500">Price level: {price_level}</span>
        </div>
      </div>

      {flights && flights.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {flights.map((flight, index) => {
            const isSelected = selectedFlightId === flight.id;
            return (
              <Card
                key={flight.id || index}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "border-cyan-500 bg-cyan-50 shadow-md" 
                    : "hover:-translate-y-0.5 hover:shadow-md"
                }`}
                onClick={() => handleSelectFlight(flight)}
              >
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isSelected ? "bg-cyan-100" : "bg-slate-100"}`}>
                      <Plane className={`h-6 w-6 ${isSelected ? "text-cyan-600" : "text-slate-600"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {flight.option_id && `Option ${flight.option_id}: `}
                        {flight.airline}
                      </p>
                      <p className="text-xs text-slate-500">
                        {flight.departure_airport} → {flight.arrival_airport}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center justify-center gap-4 md:gap-8">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900">{flight.departure_time}</p>
                      <p className="text-xs text-slate-500">{flight.departure_airport}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDuration(flight.duration)}
                      </div>
                      <div className="my-1 h-px w-20 bg-slate-300" />
                      <span className={`text-xs ${flight.stops === 0 ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                        {getStopsLabel(flight.stops)}
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900">{flight.arrival_time}</p>
                      <p className="text-xs text-slate-500">{flight.arrival_airport}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
                    <div>
                      <p className="text-xl font-bold text-slate-900">${flight.price}</p>
                      <p className="text-xs text-slate-500">{flight.cabin}</p>
                    </div>
                    {isSelected ? (
                      <Button 
                        size="sm" 
                        className="bg-emerald-500 hover:bg-emerald-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmFlight(flight);
                        }}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Confirm
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400">
                        Select
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Plane className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-2 text-slate-600">No flights found for your search criteria.</p>
          <p className="text-sm text-slate-500">Try adjusting your search parameters.</p>
        </div>
      )}
    </div>
  );
}

export function parseFlightsData(content: string): FlightsResultsData | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Handle new format with flight_options
    if (parsed.type === "flight_options" && parsed.flight_options) {
      return {
        search_parameters: parsed.search_parameters,
        current_price: parsed.price_info?.current_price || 0,
        price_level: parsed.price_info?.price_level || "N/A",
        flights: parsed.flight_options,
      } as FlightsResultsData;
    }
    
    // Handle old format with flights
    if (parsed.flights && Array.isArray(parsed.flights)) {
      return parsed as FlightsResultsData;
    }
    return null;
  } catch {
    return null;
  }
}
