import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuestionCardProps {
  question: string;
  choices: string[];
  onAnswer: (answer: string) => void;
}

export default function QuestionCard({ question, choices, onAnswer }: QuestionCardProps) {
  return (
    <Card className="w-full max-w-md mx-auto my-4 overflow-hidden border-periwinkle/20 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-gradient-to-r from-periwinkle/10 to-transparent">
        <CardTitle className="text-lg font-medium text-foreground/90">
          Clarification Needed
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <p className="text-base text-muted-foreground leading-relaxed">
          {question}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="outline"
              className="hover:bg-periwinkle hover:text-white transition-all duration-300"
              onClick={() => onAnswer(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

