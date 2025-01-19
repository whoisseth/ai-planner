"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DailyReflectionPage() {
  const [reflection, setReflection] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");

  const handleSubmit = () => {
    // Here you would typically send the reflection to your backend
    // and get AI suggestions. For now, we'll just simulate it.
    setAiSuggestion(
      "Based on your reflection, consider focusing more on task prioritization tomorrow. Try to allocate specific time blocks for your most important tasks.",
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Daily Reflection</h2>
      <Card>
        <CardHeader>
          <CardTitle>Today's Reflection</CardTitle>
          <CardDescription>
            Take a moment to reflect on your day and what you've accomplished.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="How was your day? What did you accomplish? What could you improve?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="min-h-[200px]"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit}>Submit Reflection</Button>
        </CardFooter>
      </Card>
      {aiSuggestion && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestion</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{aiSuggestion}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
