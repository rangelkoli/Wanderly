import React, { useMemo, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlaceOption {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  area?: string;
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

  return (
    <div className="max-w-5xl w-full mx-auto my-6 rounded-2xl border border-white/10 bg-[#131722] p-5 md:p-6">
      <div className="mb-4">
        <h3 className="text-lg md:text-xl font-semibold text-foreground">{prompt}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select {minSelect}
          {maxSelect ? `-${maxSelect}` : "+"} place{maxSelect === 1 ? "" : "s"} to include.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {places.map((place) => {
          const selected = selectedSet.has(place.id);
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => toggle(place.id)}
              className={cn(
                "relative rounded-2xl border text-left overflow-hidden transition-colors",
                selected
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-white/5 to-white/0">
                {place.image_url ? (
                  <img
                    src={place.image_url}
                    alt={place.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight">{place.name}</p>
                  {selected ? <Check className="h-4 w-4 text-blue-400 shrink-0" /> : null}
                </div>
                {place.area ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.area}
                  </p>
                ) : null}
                {place.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{place.description}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} selected
          {maxSelect ? ` / ${maxSelect} max` : ""}
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
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            canSubmit ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/10 text-white/40 cursor-not-allowed",
          )}
        >
          Add to itinerary
        </button>
      </div>
    </div>
  );
}
