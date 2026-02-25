import React, { useState } from "react";
import { BotIcon, Circle, Pencil, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AskHumanQuestion {
  id?: string;
  question: string;
  choices: string[];
}

export interface AskHumanAnswersPayload {
  answers: Array<{
    id?: string;
    question: string;
    answer: string;
  }>;
}

interface QuestionCardProps {
  question?: string;
  choices?: string[];
  questions?: AskHumanQuestion[];
  onAnswer: (answer: string | AskHumanAnswersPayload) => void;
}

export default function QuestionCard({ question, choices = [], questions, onAnswer }: QuestionCardProps) {
  const [isTypingOther, setIsTypingOther] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const questionList: AskHumanQuestion[] =
    questions && questions.length ? questions : question ? [{ question, choices }] : [];
  const currentQuestion = questionList[currentIndex];
  const isMultiQuestion = questionList.length > 1;

  const submitAnswer = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !currentQuestion) return;

    const nextAnswers = { ...answers, [currentIndex]: trimmed };
    setAnswers(nextAnswers);
    setOtherValue("");
    setIsTypingOther(false);

    if (currentIndex < questionList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    if (questionList.length === 1) {
      onAnswer(trimmed);
      return;
    }

    onAnswer({
      answers: questionList.map((q, index) => ({
        id: q.id,
        question: q.question,
        answer: nextAnswers[index] ?? "",
      })),
    });
  };

  const handleOtherSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    submitAnswer(otherValue);
  };

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl w-full mx-auto my-6">
      <div className="flex items-start gap-4">
        {/* Robot Icon */}
        <div className="flex-shrink-0 mt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#3b82f6]/20 border border-[#3b82f6]/30 shadow-sm">
            <BotIcon className="h-5 w-5 text-[#3b82f6]" />
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {isMultiQuestion && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground/60">
              Question {currentIndex + 1} of {questionList.length}
            </p>
          )}
          <h2 className="text-xl font-semibold text-foreground/90 tracking-tight pt-0.5">
            {currentQuestion.question}
          </h2>

          <div className="grid gap-2">
            {(currentQuestion.choices || []).map((choice) => (
              <button
                key={choice}
                onClick={() => submitAnswer(choice)}
                className={cn(
                  "group relative flex w-full items-center gap-4 rounded-xl border border-white/5 bg-[#1e222d] p-4 text-left transition-all hover:bg-[#252a3a] hover:border-white/10 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                )}
              >
                <Circle className="h-5 w-5 text-muted-foreground/50 group-hover:text-blue-400 transition-colors" />
                <span className="text-base font-medium text-foreground/80 group-hover:text-foreground">
                  {choice}
                </span>
              </button>
            ))}

            {!isTypingOther ? (
              <button
                onClick={() => setIsTypingOther(true)}
                className={cn(
                  "group relative flex w-full items-center gap-4 rounded-xl border border-white/5 bg-[#1e222d] p-4 text-left transition-all hover:bg-[#252a3a] hover:border-white/10 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                )}
              >
                <Pencil className="h-5 w-5 text-muted-foreground/50 group-hover:text-blue-400 transition-colors" />
                <span className="text-base font-medium text-foreground/80 group-hover:text-foreground italic">
                  Other (type to specify...)
                </span>
              </button>
            ) : (
              <form 
                onSubmit={handleOtherSubmit}
                className="relative flex items-center animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <Input
                  autoFocus
                  placeholder="Type your answer..."
                  value={otherValue}
                  onChange={(e) => setOtherValue(e.target.value)}
                  className="h-14 w-full rounded-xl border-white/10 bg-[#1e222d] pl-12 pr-12 text-lg focus-visible:ring-blue-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsTypingOther(false);
                  }}
                />
                <Pencil className="absolute left-4 h-5 w-5 text-blue-400" />
                {otherValue.trim() && (
                  <button
                    type="submit"
                    className="absolute right-4 rounded-md bg-blue-600 p-1.5 text-white transition-all hover:bg-blue-500 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </form>
            )}
          </div>
          
          <div className="flex items-center justify-center pt-2">
            <p className="text-xs text-muted-foreground/40 font-medium select-none">
              {isMultiQuestion ? "Answer each question to continue" : "Select an option or type"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
