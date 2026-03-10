"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

import type { SessionInterrupt } from "@/lib/langgraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { formatFlightPrice, formatPriceLevel } from "./helpers";
import { FlightOptionBrief } from "./flight-option-brief";

export function ThinkingIndicator() {
  return (
    <div className='anim-fade-in-up overflow-hidden rounded-2xl border border-[#1f2937]/6 bg-white/80'>
      <div className='relative h-0.5 w-full overflow-hidden bg-[#1f2937]/5'>
        <div className='anim-thinking-bar absolute inset-0 bg-gradient-to-r from-[#d66b2d] via-[#1c7c7d] to-[#d66b2d]' />
      </div>
      <div className='flex items-center gap-3 px-5 py-4'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c7c7d]/8'>
          <svg
            className='h-4 w-4 animate-spin text-[#1c7c7d]'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-20'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='3'
            />
            <path
              className='opacity-80'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
            />
          </svg>
        </div>
        <div>
          <p className='text-sm font-semibold text-[#1f2937]'>
            Planning your trip
          </p>
          <p className='anim-thinking-dots mt-0.5 text-xs text-[#5f6b7a]'>
            <span>Working</span> <span>on</span> <span>it</span>
          </p>
        </div>
      </div>
    </div>
  );
}

type AskHumanInterruptProps = {
  interrupt: SessionInterrupt;
  humanAnswers: Record<string, string>;
  setHumanAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  onResume: () => void;
  onRefresh: () => void;
  isStreaming: boolean;
  isLoading: boolean;
};

export function AskHumanInterrupt({
  interrupt,
  humanAnswers,
  setHumanAnswers,
  onResume,
  onRefresh,
  isStreaming,
  isLoading,
}: AskHumanInterruptProps) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeQuestion = interrupt.questions[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === interrupt.questions.length - 1;
  const totalQuestions = interrupt.questions.length;
  const allAnswered = interrupt.questions.every(
    (question) => (humanAnswers[question.id] ?? "").trim().length > 0,
  );
  const progressValue = ((activeQuestionIndex + 1) / totalQuestions) * 100;

  function updateAnswer(questionId: string, answer: string) {
    setLocalError(null);
    setHumanAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  function transition(fn: () => void) {
    setIsTransitioning(true);
    setTimeout(() => {
      fn();
      setIsTransitioning(false);
    }, 150);
  }

  function handleTabClick(index: number) {
    if (index === activeQuestionIndex) return;
    transition(() => setActiveQuestionIndex(index));
  }

  function handleAdvance() {
    if (!activeQuestion) return;

    const currentAnswer = (humanAnswers[activeQuestion.id] ?? "").trim();
    if (!currentAnswer) {
      setLocalError("Please answer this question before continuing.");
      return;
    }

    if (isLastQuestion) {
      onResume();
      return;
    }

    transition(() =>
      setActiveQuestionIndex((index) => Math.min(index + 1, totalQuestions - 1)),
    );
  }

  return (
    <Card className='w-full overflow-hidden'>
      <Progress value={progressValue} className='h-1 rounded-none' />

      <CardHeader className='pb-4'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <div>
              <CardTitle className='text-base'>Your input is needed</CardTitle>
              <CardDescription className='mt-0.5 text-xs'>
                The planner paused — answer the questions below to continue.
              </CardDescription>
            </div>
          </div>
          {allAnswered ? (
            <Badge
              variant='secondary'
              className='gap-1.5 border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
            >
              <svg
                className='h-3 w-3'
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
              All answered
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className='pb-0 pt-5'>
        {totalQuestions > 1 ? (
          <div className='mb-5 flex w-full items-center gap-2'>
            {interrupt.questions.map((question, index) => {
              const isActive = index === activeQuestionIndex;
              const isCompleted = Boolean(
                (humanAnswers[question.id] ?? "").trim(),
              );
              const isReachable = index <= activeQuestionIndex;

              return (
                <button
                  key={question.id}
                  type='button'
                  aria-current={isActive ? "step" : undefined}
                  disabled={!isReachable}
                  onClick={() => handleTabClick(index)}
                  className={cn(
                    "relative min-w-0 flex-1 rounded-[2px] border px-4 py-2.5 text-center text-sm font-medium tracking-[0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "border-border bg-accent text-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.55),0_0_0_1px_hsl(var(--border)/0.35)]"
                      : isCompleted || isReachable
                        ? "border-border/80 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                        : "cursor-not-allowed border-border/60 bg-muted/65 text-muted-foreground/50",
                  )}
                >
                  <span className='block truncate'>
                    {question.question.length > 24
                      ? `${question.question.slice(0, 24)}…`
                      : question.question}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-lg border bg-card p-4 transition-all duration-150",
            isTransitioning
              ? "scale-[0.98] opacity-0"
              : "scale-100 opacity-100",
          )}
        >
          {activeQuestion ? (
            <div className='space-y-4' key={activeQuestion.id}>
              <div className='flex items-center justify-between gap-3'>
                <Label className='text-sm font-semibold leading-snug text-foreground'>
                  {activeQuestion.question}
                </Label>
                <Badge variant='outline' className='shrink-0 tabular-nums'>
                  {activeQuestionIndex + 1} / {totalQuestions}
                </Badge>
              </div>

              {activeQuestion.choices.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {activeQuestion.choices.map((choice) => {
                    const isSelected = humanAnswers[activeQuestion.id] === choice;
                    return (
                      <button
                        key={choice}
                        type='button'
                        onClick={() => updateAnswer(activeQuestion.id, choice)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <Textarea
                rows={3}
                placeholder='Type your answer here…'
                className='resize-none text-sm'
                value={humanAnswers[activeQuestion.id] ?? ""}
                onChange={(event) =>
                  updateAnswer(activeQuestion.id, event.target.value)
                }
              />
            </div>
          ) : null}
        </div>

        {localError ? (
          <p className='mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive'>
            <svg
              className='h-3.5 w-3.5 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            {localError}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className='mt-5 flex items-center gap-2 pt-4'>
        <Button
          variant='outline'
          size='sm'
          disabled={activeQuestionIndex === 0 || isStreaming}
          onClick={() => {
            setLocalError(null);
            transition(() => setActiveQuestionIndex((index) => Math.max(index - 1, 0)));
          }}
        >
          <svg
            className='mr-1.5 h-3.5 w-3.5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M15 19l-7-7 7-7'
            />
          </svg>
          Back
        </Button>

        <Button size='sm' disabled={isStreaming} onClick={handleAdvance}>
          {isStreaming ? (
            <>
              <svg
                className='mr-1.5 h-3.5 w-3.5 animate-spin'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                />
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                />
              </svg>
              Continuing…
            </>
          ) : (
            <>
              {isLastQuestion ? "Continue planning" : "Next question"}
              <svg
                className='ml-1.5 h-3.5 w-3.5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M13 7l5 5m0 0l-5 5m5-5H6'
                />
              </svg>
            </>
          )}
        </Button>

        <Button
          variant='ghost'
          size='sm'
          className='ml-auto'
          disabled={isLoading}
          onClick={onRefresh}
        >
          <svg
            className='mr-1.5 h-3.5 w-3.5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

type FlightSelectionInterruptProps = {
  interrupt: SessionInterrupt;
  selectedFlightOption: number | null;
  setSelectedFlightOption: Dispatch<SetStateAction<number | null>>;
  onResume: () => void;
  onRefresh: () => void;
  isStreaming: boolean;
  isLoading: boolean;
};

function getSearchSummaryValue(
  searchParams: Record<string, unknown> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = searchParams?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function FlightSelectionInterrupt({
  interrupt,
  selectedFlightOption,
  setSelectedFlightOption,
  onResume,
  onRefresh,
  isStreaming,
  isLoading,
}: FlightSelectionInterruptProps) {
  const bestFlight = interrupt.flightOptions.find((option) => option.is_best);
  const bestFlightPriceLevel = bestFlight?.price_level
    ? formatPriceLevel(bestFlight.price_level)
    : null;
  const origin = getSearchSummaryValue(interrupt.searchParams, [
    "origin",
    "from",
    "departure_airport",
  ]);
  const destination = getSearchSummaryValue(interrupt.searchParams, [
    "destination",
    "to",
    "arrival_airport",
  ]);
  const departureDate = getSearchSummaryValue(interrupt.searchParams, [
    "departure_date",
    "date",
    "outbound_date",
  ]);
  const travelers = getSearchSummaryValue(interrupt.searchParams, [
    "travelers",
    "passengers",
    "adults",
  ]);

  return (
    <section className='anim-fade-in-up overflow-hidden rounded-[28px] border border-[#dadce0] bg-[#f8fafd] shadow-[0_18px_48px_rgba(60,64,67,0.12)]'>
      <div className='border-b border-[#e8eaed] bg-white px-5 py-4 sm:px-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]'>
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M2.5 19h19M5 16.5l5.268-1.756a2 2 0 001.112-.915L14 9l5.5-1.5M12 14l-1-8'
                />
              </svg>
            </div>
            <div className='flex-1'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-[#5f6368]'>
                Flight options
              </p>
              <h3 className='mt-1 text-[clamp(1.2rem,2vw,1.55rem)] font-semibold tracking-[-0.04em] text-[#202124]'>
                Choose a flight that fits your trip
              </h3>
              <p className='mt-1 max-w-2xl text-sm leading-6 text-[#5f6368]'>
                {interrupt.prompt ??
                  "Compare the top matches, then confirm the option you want Wanderly to use."}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='rounded-full border-[#cee0fc] bg-[#eef3fd] px-3 py-1 text-[#1967d2] shadow-none'>
              {interrupt.flightOptions.length} option
              {interrupt.flightOptions.length === 1 ? "" : "s"}
            </Badge>
            {bestFlightPriceLevel ? (
              <Badge
                className={cn(
                  "rounded-full border px-3 py-1 shadow-none",
                  bestFlightPriceLevel.color,
                )}
              >
                {bestFlightPriceLevel.label}
              </Badge>
            ) : null}
            <button
              className='inline-flex h-9 items-center rounded-full border border-[#dadce0] bg-white px-4 text-sm font-medium text-[#3c4043] transition-colors hover:border-[#c6dafc] hover:bg-[#f1f6fe] disabled:opacity-50'
              disabled={isLoading}
              onClick={onRefresh}
              type='button'
            >
              Refresh results
            </button>
          </div>
        </div>

        <div className='mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-2xl border border-[#e8eaed] bg-[#f8fafd] px-4 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]'>
              Route
            </p>
            <p className='mt-1 text-sm font-semibold text-[#202124]'>
              {origin && destination ? `${origin} to ${destination}` : "Selected route"}
            </p>
          </div>
          <div className='rounded-2xl border border-[#e8eaed] bg-[#f8fafd] px-4 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]'>
              Date
            </p>
            <p className='mt-1 text-sm font-semibold text-[#202124]'>
              {departureDate ?? "Best available"}
            </p>
          </div>
          <div className='rounded-2xl border border-[#e8eaed] bg-[#f8fafd] px-4 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]'>
              Travelers
            </p>
            <p className='mt-1 text-sm font-semibold text-[#202124]'>
              {travelers ?? "Traveler details not provided"}
            </p>
          </div>
          <div className='rounded-2xl border border-[#e8eaed] bg-[#f8fafd] px-4 py-3'>
            <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368]'>
              Best match
            </p>
            <p className='mt-1 text-sm font-semibold text-[#202124]'>
              {bestFlight ? `${bestFlight.airline ?? "Recommended"} · ${formatFlightPrice(bestFlight.price)}` : "Comparing fares"}
            </p>
          </div>
        </div>
      </div>

      <div className='px-3 py-3 sm:px-4 sm:py-4'>
        <div className='mb-2 hidden grid-cols-[minmax(0,1fr)_120px] items-center px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#5f6368] lg:grid'>
          <span>Flight</span>
          <span className='text-right'>Price</span>
        </div>

        <div className='grid gap-2.5'>
          {interrupt.flightOptions.map((option, idx) => (
            <FlightOptionBrief
              compact={false}
              index={idx}
              isSelected={selectedFlightOption === option.option_id}
              key={`${interrupt.id}-${option.option_id}`}
              onSelect={() => setSelectedFlightOption(option.option_id)}
              option={option}
            />
          ))}
        </div>

        <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eaed] px-2 pt-4 sm:px-1'>
          <p className='text-sm text-[#5f6368]'>
            Select one result to continue building the rest of the itinerary.
          </p>
          <button
            className='inline-flex h-11 items-center gap-2 rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1765cc] disabled:opacity-50'
            disabled={isStreaming || selectedFlightOption === null}
            onClick={onResume}
            type='button'
          >
            {isStreaming ? "Saving choice..." : "Continue with selected flight"}
            <svg
              className='h-4 w-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M13 7l5 5m0 0l-5 5m5-5H6' />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
