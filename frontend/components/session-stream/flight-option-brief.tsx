"use client";

import type { CSSProperties } from "react";

import type { FlightOption } from "@/lib/langgraph";
import { cn } from "@/lib/utils";

import {
  formatFlightPrice,
  formatFlightStops,
  formatPriceLevel,
} from "./helpers";

type FlightOptionBriefProps = {
  option: FlightOption;
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
};

function FlightRouteBar({ option }: { option: FlightOption }) {
  const stopCount = typeof option.stops === "number" ? option.stops : null;
  const fillClass =
    stopCount === 0
      ? "bg-emerald-500"
      : stopCount === 1
        ? "bg-[#4285f4]"
        : "bg-amber-500";

  return (
    <div className='flex min-w-0 items-center gap-2'>
      <div className='h-[2px] flex-1 rounded-full bg-[#dadce0]'>
        <div
          className={cn("h-full rounded-full", fillClass)}
          style={{
            width:
              stopCount === null
                ? "44%"
                : stopCount === 0
                  ? "100%"
                  : stopCount === 1
                    ? "64%"
                    : "42%",
          }}
        />
      </div>
      <span className='shrink-0 text-[11px] font-medium text-[#5f6368]'>
        {formatFlightStops(option.stops)}
      </span>
    </div>
  );
}

export function FlightOptionBrief({
  option,
  index = 0,
  isSelected = false,
  onSelect,
  compact = false,
}: FlightOptionBriefProps) {
  const priceLevelInfo = option.price_level
    ? formatPriceLevel(option.price_level)
    : null;
  const Container = onSelect ? "button" : "div";
  const priceLabel = compact ? "Price" : "round trip";

  return (
    <Container
      className={cn(
        "anim-fade-in-up anim-stagger group relative w-full overflow-hidden border text-left transition-all duration-200",
        compact
          ? "rounded-2xl bg-white shadow-[0_6px_20px_rgba(60,64,67,0.08)]"
          : "rounded-[22px] bg-white shadow-[0_8px_24px_rgba(60,64,67,0.10)]",
        isSelected
          ? "border-[#1a73e8] ring-2 ring-[#e8f0fe]"
          : "border-[#dadce0] hover:border-[#aecbfa] hover:shadow-[0_10px_28px_rgba(60,64,67,0.12)]",
      )}
      onClick={onSelect}
      style={{ "--i": index } as CSSProperties}
      type={onSelect ? "button" : undefined}
    >
      <div className='flex items-start justify-between gap-3 border-b border-[#f1f3f4] px-4 py-4 sm:px-5'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm font-medium text-[#202124]'>
              {option.airline ?? "Airline"}
            </span>
            {option.cabin ? (
              <span className='rounded-full bg-[#eef3fd] px-2.5 py-1 text-[11px] font-medium text-[#1967d2]'>
                {option.cabin}
              </span>
            ) : null}
            {priceLevelInfo ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium",
                  priceLevelInfo.color,
                )}
              >
                {priceLevelInfo.label}
              </span>
            ) : null}
            {option.is_best ? (
              <span className='rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-medium text-[#137333]'>
                Best
              </span>
            ) : null}
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#5f6368]'>
            <span>{option.departure_airport ?? "Unknown"}</span>
            <span className='text-[#9aa0a6]'>to</span>
            <span>{option.arrival_airport ?? "Unknown"}</span>
            {option.arrival_time_ahead ? (
              <span className='font-medium text-[#188038]'>
                {option.arrival_time_ahead}
              </span>
            ) : null}
          </div>
        </div>

        <div className='flex items-start gap-3'>
          <div className='text-right'>
            <div
              className={cn(
                "font-semibold tracking-[-0.04em] text-[#202124]",
                compact ? "text-2xl" : "text-[1.75rem]",
              )}
            >
              {formatFlightPrice(option.price)}
            </div>
            <div className='mt-1 text-[11px] text-[#5f6368]'>
              {priceLabel}
            </div>
          </div>
          {onSelect ? (
            <div
              className={cn(
                "mt-1 flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                isSelected
                  ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                  : "border-[#c4c7c5] bg-white text-transparent",
              )}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={3}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      <div className='px-4 py-4 sm:px-5 sm:py-5'>
        <div
          className={cn(
            "grid gap-4",
            compact ? "lg:grid-cols-[minmax(0,1fr)_200px]" : "lg:grid-cols-[minmax(0,1.15fr)_220px]",
          )}
        >
          <div>
            <div className='grid grid-cols-[minmax(64px,auto)_1fr_minmax(64px,auto)] items-center gap-3'>
              <div>
                <div className='text-xl font-semibold tracking-[-0.04em] text-[#202124]'>
                  {option.departure_time ?? "--"}
                </div>
                <div className='text-xs text-[#5f6368]'>
                  {option.departure_airport ?? "Unknown"}
                </div>
              </div>

              <div className='min-w-0'>
                <p className='mb-1 text-center text-[11px] font-medium text-[#5f6368]'>
                  {option.duration ?? "Duration unavailable"}
                </p>
                <FlightRouteBar option={option} />
              </div>

              <div className='text-right'>
                <div className='text-xl font-semibold tracking-[-0.04em] text-[#202124]'>
                  {option.arrival_time ?? "--"}
                </div>
                <div className='text-xs text-[#5f6368]'>
                  {option.arrival_airport ?? "Unknown"}
                </div>
              </div>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              {option.arrival_time_ahead ? (
                <span className='rounded-full border border-[#cee0fc] bg-[#eef3fd] px-2.5 py-1 text-[11px] font-medium text-[#1967d2]'>
                  {option.arrival_time_ahead}
                </span>
              ) : null}
              {option.delay ? (
                <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-[#b06000]'>
                  {option.delay}
                </span>
              ) : null}
            </div>
          </div>

          <div className='rounded-2xl border border-[#e8eaed] bg-[#f8fafd] p-3.5'>
            <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-[#5f6368]'>
              Flight details
            </p>
            <dl className='mt-3 space-y-2 text-sm text-[#5f6368]'>
              <div className='flex items-center justify-between gap-3'>
                <dt>Carrier</dt>
                <dd className='font-medium text-[#202124]'>
                  {option.airline ?? "Unknown"}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <dt>Cabin</dt>
                <dd className='font-medium text-[#202124]'>
                  {option.cabin ?? "Unspecified"}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <dt>Journey</dt>
                <dd className='font-medium text-[#202124]'>
                  {option.duration ?? "n/a"}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <dt>Stops</dt>
                <dd className='font-medium text-[#202124]'>
                  {formatFlightStops(option.stops)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Container>
  );
}
