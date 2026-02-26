import { useMemo, useState } from "react";
import { Check, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlaceOption {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  area?: string;
  category?: string;
  rating?: number;
  review_count?: number;
}

export interface PlaceSelectionPayload {
  selected_places: Array<{
    id: string;
    name: string;
  }>;
}

interface PlaceSelectionCardProps {
  prompt: string;
  places: PlaceOption[];
  minSelect?: number;
  maxSelect?: number | null;
  onSubmit: (payload: PlaceSelectionPayload) => void;
}

export default function PlaceSelectionCard({
  prompt,
  places,
  minSelect = 1,
  maxSelect = null,
  onSubmit,
}: PlaceSelectionCardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) return prev.filter((p) => p !== id);
      if (maxSelect && prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  };

  const canSubmit = selectedIds.length >= minSelect;

  const normalizedMax = maxSelect ?? places.length;

  return (
    <div className="mx-auto my-6 w-full max-w-6xl rounded-3xl border border-sky-100 bg-[#f8fcff] p-4 shadow-[0_20px_48px_rgba(14,36,64,0.12)] md:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-600">Itinerary Builder</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Places you may love
        </h3>
        <p className="mt-1 text-sm text-slate-600">{prompt}</p>
        <p className="mt-2 text-xs text-slate-500">
          Select {minSelect}
          {maxSelect ? `-${maxSelect}` : "+"} place{maxSelect === 1 ? "" : "s"} to include.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {places.map((place) => {
          const selected = selectedSet.has(place.id);
          const imageUrl = place.image_url?.trim();
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => toggle(place.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white text-left transition",
                selected
                  ? "border-cyan-500 shadow-[0_0_0_2px_rgba(6,182,212,0.25)]"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={place.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,#22d3ee_0%,#0ea5e9_35%,#1e293b_100%)]" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                <div className="absolute right-2 top-2 rounded-full bg-white/95 p-1">
                  {selected ? <Check className="h-4 w-4 text-cyan-600" /> : <div className="h-4 w-4 rounded-full border border-slate-300" />}
                </div>
                {place.rating ? (
                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[11px] text-white">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                    {place.rating.toFixed(1)}
                    {place.review_count ? ` (${place.review_count})` : ""}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight text-slate-900">{place.name}</p>
                  {place.category ? (
                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-700">
                      {place.category}
                    </span>
                  ) : null}
                </div>
                {place.area ? (
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {place.area}
                  </p>
                ) : null}
                {place.description ? (
                  <p className="line-clamp-2 text-xs text-slate-600">{place.description}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Selected <span className="font-semibold text-slate-900">{selectedIds.length}</span> / {normalizedMax}
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              selected_places: places
                .filter((place) => selectedSet.has(place.id))
                .map((place) => ({ id: place.id, name: place.name })),
            })
          }
          className={cn(
            "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
            canSubmit
              ? "bg-cyan-500 text-white hover:bg-cyan-400"
              : "cursor-not-allowed bg-slate-200 text-slate-400",
          )}
        >
          Add Selected to Itinerary
        </button>
      </div>
    </div>
  );
}
