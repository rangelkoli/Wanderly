"use client";

import { useState, type CSSProperties } from "react";

import type {
  FlightSearchPayload,
  ItineraryPayload,
  SessionMessage,
} from "@/lib/langgraph";
import { Badge } from "@/components/ui/badge";

import {
  FALLBACK_PLACE_IMAGE,
  buildFlightSummary,
  formatJson,
  formatMessageTitle,
  getDayMapData,
  roleAccent,
} from "./helpers";
import { FlightOptionBrief } from "./flight-option-brief";
import { GoogleDayMap } from "./google-day-map";
import type { StreamEventRecord } from "./types";

function DayMapCard({ day }: { day: ItineraryPayload["days"][number] }) {
  const { points, googleMapUrl } = getDayMapData(day);

  if (points.length === 0 && !day.route?.map_image_url) {
    return null;
  }

  return (
    <div className='space-y-4'>
      <div className='overflow-hidden rounded-[1.8rem] border border-[#1f2937]/8 bg-[#ece6da] shadow-[0_18px_50px_rgba(31,41,55,0.08)]'>
        {googleMapUrl ? (
          <GoogleDayMap
            dayTitle={day.title}
            fallbackImageUrl={googleMapUrl}
            points={points}
          />
        ) : (
          <div className='flex h-[520px] items-center justify-center px-6 text-center text-sm text-[#5f6b7a]'>
            Route preview available, but no place coordinates were included for
            this day.
          </div>
        )}
      </div>

      <div className='rounded-[1.5rem] bg-[#111111] p-5 text-[#f6efe4] shadow-[0_24px_60px_rgba(17,17,17,0.18)]'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d5b878]'>
          Curator insight
        </p>
        <p className='mt-3 text-sm leading-7 text-[#f6efe4]/88'>
          {points[0]
            ? `Begin with ${points[0].name} and let the route unfold toward ${points.at(-1)?.name ?? "your final stop"}. The day is paced for a polished rhythm rather than rushed transit.`
            : "Coordinates are not available yet, but this panel will surface route context and pacing once stops are mapped."}
        </p>
        <div className='mt-4 flex flex-wrap gap-2'>
          <Badge className='border-[#d5b878]/15 bg-[#d5b878]/10 text-[#f6efe4]'>
            {typeof day.route?.distance_km === "number"
              ? `${day.route.distance_km} km`
              : "Distance n/a"}
          </Badge>
          <Badge className='border-white/10 bg-white/8 text-[#f6efe4]'>
            {typeof day.route?.duration_min === "number"
              ? `${day.route.duration_min} min`
              : "Duration n/a"}
          </Badge>
        </div>
      </div>

      <div className='rounded-[1.5rem] border border-[#1f2937]/8 bg-white/80 p-4'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5f6b7a]'>
          Stop index
        </p>
        <div className='mt-3 space-y-2'>
          {points.length > 0 ? (
            points.map((point) => (
              <div
                className='rounded-[1.2rem] bg-[#f6efe4]/80 px-3 py-3'
                key={`legend-${point.id}`}
              >
                <div className='flex items-start gap-3'>
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b8842f] text-[11px] font-bold text-white'>
                    {point.index + 1}
                  </span>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-[#1f2937]'>
                      {point.name}
                    </p>
                    <p className='text-[11px] uppercase tracking-[0.18em] text-[#1c7c7d]'>
                      {point.category}
                    </p>
                    <p className='mt-1 text-xs text-[#5f6b7a]'>
                      {point.timeLabel}
                    </p>
                    <p className='mt-1 text-[11px] text-[#5f6b7a]/80'>
                      {point.location}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className='text-sm text-[#5f6b7a]'>
              Add coordinates to itinerary places to unlock the day map.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ItineraryDisplay({
  itinerary,
}: {
  itinerary: ItineraryPayload;
}) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const resolvedDayIndex =
    activeDayIndex < itinerary.days.length ? activeDayIndex : 0;
  const activeDay =
    itinerary.days[resolvedDayIndex] ?? itinerary.days[0] ?? null;

  if (!activeDay) {
    return null;
  }

  return (
    <section className='anim-fade-in space-y-6'>
      <div className='anim-fade-in-up space-y-3'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.42em] text-[#b8842f]'>
          Grand tour collection
        </p>
        <h2 className='max-w-3xl text-4xl font-semibold uppercase tracking-[-0.06em] text-[#1f2937] sm:text-5xl'>
          {itinerary.itinerary_title}
        </h2>
        <p className='max-w-2xl text-sm leading-7 text-[#5f6b7a] sm:text-[15px]'>
          {itinerary.destination} · {itinerary.days.length}{" "}
          {itinerary.days.length === 1 ? "day" : "days"}
        </p>
      </div>

      {itinerary.selected_flight ? (
        <div className='flex items-center gap-3 rounded-xl border border-[#1c7c7d]/15 bg-[#1c7c7d]/4 p-4'>
          <svg
            className='h-5 w-5 shrink-0 text-[#1c7c7d]'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M5 3l14 9-14 9V3z'
            />
          </svg>
          <div className='text-sm text-[#1f2937]'>
            <span className='font-semibold'>Selected flight:</span>{" "}
            {buildFlightSummary(itinerary.selected_flight)} ·{" "}
            {itinerary.selected_flight.price
              ? `$${itinerary.selected_flight.price}`
              : "Price unavailable"}
          </div>
        </div>
      ) : null}

      <div className='overflow-hidden rounded-[2rem] border border-[#1f2937]/8 bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(248,242,232,0.92))] shadow-[0_24px_80px_rgba(102,81,44,0.12)]'>
        <div className='grid lg:grid-cols-[104px_minmax(0,1.05fr)_minmax(360px,0.95fr)]'>
          <aside className='border-b border-[#1f2937]/6 bg-[linear-gradient(180deg,rgba(255,251,245,0.9),rgba(244,236,223,0.72))] px-3 py-4 lg:border-b-0 lg:border-r lg:px-2 lg:py-8'>
            <div className='flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible'>
              {itinerary.days.map((day, dayIdx) => {
                const isActive = dayIdx === resolvedDayIndex;
                return (
                  <button
                    className={`group anim-fade-in-up anim-stagger min-w-[88px] rounded-[1.35rem] border px-3 py-3 text-left transition-all duration-300 ${isActive ? "border-[#b8842f]/40 bg-[#b8842f] text-[#fff8ee] shadow-[0_18px_30px_rgba(184,132,47,0.22)]" : "border-transparent bg-white/55 text-[#6b7280] hover:border-[#1f2937]/8 hover:bg-white/85 hover:text-[#1f2937]"}`}
                    key={day.day_number}
                    onClick={() => setActiveDayIndex(dayIdx)}
                    style={{ "--i": dayIdx } as CSSProperties}
                    type='button'
                  >
                    <div className='text-[10px] font-semibold uppercase tracking-[0.28em]'>
                      Day
                    </div>
                    <div className='mt-1 text-2xl font-semibold tracking-[-0.08em]'>
                      {String(day.day_number).padStart(2, "0")}
                    </div>
                    <div className={`mt-1 line-clamp-2 text-[10px] leading-4 ${isActive ? "text-[#fff8ee]/78" : "text-[#5f6b7a]"}`}>
                      {day.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className='border-b border-[#1f2937]/6 px-5 py-6 sm:px-8 sm:py-8 lg:border-b-0 lg:border-r'>
            <div className='flex flex-wrap items-end justify-between gap-4'>
              <div>
                <div className='flex items-end gap-3'>
                  <span className='text-5xl font-light italic tracking-[-0.08em] text-[#d3b26b]'>
                    {String(activeDay.day_number).padStart(2, "0")}
                  </span>
                  <div className='pb-1'>
                    <h3 className='text-3xl font-semibold uppercase tracking-[-0.06em] text-[#1f2937]'>
                      {activeDay.title}
                    </h3>
                    <p className='mt-1 text-xs font-medium uppercase tracking-[0.28em] text-[#7b8794]'>
                      {activeDay.date_label}
                    </p>
                  </div>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge className='border-[#b8842f]/20 bg-[#b8842f]/8 text-[#9d6d10]'>
                  {activeDay.budget_label}
                </Badge>
                <Badge className='border-[#1f2937]/10 bg-white/80 text-[#5f6b7a]'>
                  {activeDay.activities_count} activities
                </Badge>
              </div>
            </div>

            <div className='mt-8 space-y-8'>
              {activeDay.sessions.map((session, sessionIndex) => (
                <div
                  className='anim-fade-in-up anim-stagger relative pl-8'
                  key={`${activeDay.day_number}-${session.label}-${sessionIndex}`}
                  style={{ "--i": sessionIndex } as CSSProperties}
                >
                  <div className='absolute bottom-0 left-0 top-0 w-px bg-[linear-gradient(180deg,rgba(184,132,47,0.42),rgba(184,132,47,0.08))]' />
                  <div className='absolute left-[-5px] top-2 h-3 w-3 rounded-full border border-[#d5b878] bg-[#fff8ee]' />

                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <h4 className='text-[11px] font-semibold uppercase tracking-[0.3em] text-[#9d6d10]'>
                      {session.label}
                    </h4>
                    {session.transfer_note ? (
                      <span className='text-xs text-[#5f6b7a]/75'>
                        {session.transfer_note}
                      </span>
                    ) : null}
                  </div>

                  <div className='mt-4 space-y-6'>
                    {session.items.map((item) => (
                      <article
                        className='group grid gap-4 lg:grid-cols-[92px_minmax(0,1fr)]'
                        key={item.id}
                      >
                        <div className='space-y-1'>
                          <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9d6d10]'>
                            {item.start_time}
                          </p>
                          <p className='text-[11px] text-[#7b8794]'>
                            until {item.end_time}
                          </p>
                        </div>

                        <div className='space-y-3'>
                          <div>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h5 className='text-2xl font-semibold tracking-[-0.05em] text-[#111827]'>
                                {item.name}
                              </h5>
                              <span className='rounded-full border border-[#1f2937]/10 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f6b7a]'>
                                {item.category}
                              </span>
                            </div>
                            <p className='mt-2 max-w-xl text-sm leading-6 text-[#5f6b7a]'>
                              {item.location}
                            </p>
                          </div>

                          {item.image_url ? (
                            <div className='overflow-hidden rounded-[1.35rem] border border-[#1f2937]/8 bg-[#ede5d8]'>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={item.name}
                                className='h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02]'
                                loading='lazy'
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src = FALLBACK_PLACE_IMAGE;
                                }}
                                src={item.image_url || FALLBACK_PLACE_IMAGE}
                              />
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='relative min-h-full bg-[#f5f1e8] p-4 sm:p-5 lg:p-6'>
            <div className='lg:sticky lg:top-6'>
              <DayMapCard day={activeDay} />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

export function MessageThread({ messages }: { messages: SessionMessage[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayMessages = isExpanded ? messages : messages.slice(-6);

  return (
    <div className='space-y-3'>
      {messages.length > 6 && !isExpanded ? (
        <button
          className='w-full rounded-xl border border-dashed border-[#1f2937]/10 px-4 py-2 text-xs font-medium text-[#5f6b7a] transition-colors hover:border-[#1f2937]/20 hover:text-[#1f2937]'
          onClick={() => setIsExpanded(true)}
          type='button'
        >
          Show {messages.length - 6} earlier messages
        </button>
      ) : null}
      {displayMessages.map((message, index) => (
        <div
          className={`anim-slide-left anim-stagger rounded-xl border-l-[3px] bg-white/80 p-4 ${roleAccent(message.role)}`}
          key={message.id}
          style={{ "--i": index } as CSSProperties}
        >
          <div className='flex items-center justify-between gap-2'>
            <span className='text-xs font-semibold text-[#1f2937]'>
              {formatMessageTitle(message)}
            </span>
            {message.toolCalls?.length ? (
              <div className='flex flex-wrap gap-1'>
                {message.toolCalls.map((toolCall, toolIndex) => (
                  <span
                    className='rounded-md bg-[#9333ea]/8 px-1.5 py-0.5 text-[10px] font-semibold text-[#9333ea]'
                    key={`${message.id}-tool-${toolIndex}`}
                  >
                    {toolCall.name ?? "tool_call"}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <pre className='mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[#5f6b7a]'>
            {message.content || "(empty)"}
          </pre>
        </div>
      ))}
      {messages.length === 0 ? (
        <div className='rounded-xl border border-dashed border-[#1f2937]/10 px-4 py-8 text-center text-sm text-[#5f6b7a]'>
          No messages yet. The planner will start shortly.
        </div>
      ) : null}
    </div>
  );
}

export function EventLog({ events }: { events: StreamEventRecord[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='anim-fade-in rounded-xl border border-[#1f2937]/6 bg-white/60'>
      <button
        className='flex w-full items-center justify-between px-4 py-3 text-left'
        onClick={() => setIsOpen((open) => !open)}
        type='button'
      >
        <div className='flex items-center gap-2'>
          <div
            className={`h-2 w-2 rounded-full ${events.length ? "animate-pulse bg-[#1c7c7d]" : "bg-[#1f2937]/20"}`}
          />
          <span className='text-xs font-semibold text-[#1f2937]'>
            Live event log
          </span>
          <span className='text-xs text-[#5f6b7a]'>({events.length})</span>
        </div>
        <svg
          className={`h-4 w-4 text-[#5f6b7a] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={2}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>
      {isOpen ? (
        <div className='max-h-96 space-y-2 overflow-y-auto border-t border-[#1f2937]/5 p-4'>
          {events.length ? (
            events.map((event) => (
              <div className='rounded-lg bg-[#f6efe4]/50 p-3' key={event.id}>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs font-semibold text-[#1f2937]'>
                    {event.event}
                  </span>
                  <span className='text-[10px] text-[#5f6b7a]'>
                    {event.receivedAt}
                  </span>
                </div>
                <pre className='mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-[#5f6b7a]'>
                  {formatJson(event.data)}
                </pre>
              </div>
            ))
          ) : (
            <p className='py-4 text-center text-xs text-[#5f6b7a]'>
              Waiting for events...
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LatestFlightsCard({
  search,
}: {
  search: FlightSearchPayload;
}) {
  return (
    <div className='anim-fade-in overflow-hidden rounded-[1.8rem] border border-[#1c7c7d]/12 bg-[linear-gradient(180deg,rgba(240,250,250,0.82),rgba(255,252,247,0.96))] shadow-[0_18px_45px_rgba(28,124,125,0.05)]'>
      <div className='border-b border-[#1f2937]/6 px-5 py-4'>
        <h4 className='text-lg font-semibold tracking-[-0.04em] text-[#1f2937]'>
          Flight brief
        </h4>
        <p className='mt-1 text-sm leading-6 text-[#5f6b7a]'>
        {search.type === "no_flights_found"
          ? (search.message ?? "No matching flights found.")
          : (search.prompt ?? "Recent options from the planner.")}
        </p>
      </div>
      {search.type === "select_flight" ? (
        <div className='grid gap-4 p-5'>
          {search.flightOptions.map((option, index) => (
            <FlightOptionBrief
              compact
              index={index}
              key={`latest-${option.option_id}`}
              option={option}
            />
          ))}
        </div>
      ) : (
        <div className='px-5 py-6 text-sm text-[#5f6b7a]'>
          No bookable flight shortlist is available right now.
        </div>
      )}
    </div>
  );
}
