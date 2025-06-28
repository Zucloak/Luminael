'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const hellBoundQuotes = [
  "Embrace the inferno. It forges the strongest wills.",
  "Here, we separate the students from the masters.",
  "The path to knowledge is paved with intellectual fire.",
  "Only through the crucible of challenge can you be purified.",
  "Doubt is a demon. Conquer it with certainty.",
  "Your trial by fire has just begun.",
  "Do you hear the whispers of forgotten knowledge? They scream here.",
  "This is not a test. This is a reckoning.",
  "In the abyss of ignorance, only the brilliant can ignite a flame.",
  "The lazy mind is the devil's playground. We've evicted him.",
  "They say knowledge is power. Prepare for apotheosis.",
  "Welcome to the intellectual coliseum.",
  "Hope is the first step on the road to disappointment. Study is the first step to victory.",
  "Let your synapses burn with glorious purpose.",
  "This quiz is the anvil. Your mind is the steel. Become a weapon.",
  "Mediocrity is the true hell. Ascend.",
  "Forget what you think you know. Prove it.",
  "Every question is a demon to be slain.",
  "The only mercy here is the truth you've mastered.",
  "Sisyphus had it easy. He only had one rock.",
  "They say the devil is in the details. He and I are well acquainted.",
  "This is the final exam for your soul.",
  "Burn away the chaff of misunderstanding.",
  "There is no 'good enough'. There is only 'correct'.",
  "The weak curse the darkness. The strong become it.",
  "Triumph is measured in the ashes of your former ignorance.",
  "This is not just difficult. It is educational damnation.",
  "Prepare for a symphony of cognitive dissonance.",
  "May your focus be as sharp as a shard of obsidian.",
  "Are you ready to question the very fabric of your understanding?",
  "This is the intellectual gauntlet. Run it.",
  "Let the river of knowledge boil.",
  "The cost of mastery is everything. Pay the price.",
];

interface LoadingQuotesProps {
  className?: string;
}

export function LoadingQuotes({ className }: LoadingQuotesProps) {
  const [quote, setQuote] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Set initial quote
    const randomQuote = hellBoundQuotes[Math.floor(Math.random() * hellBoundQuotes.length)];
    setQuote(randomQuote);

    const intervalId = setInterval(() => {
      const newRandomQuote = hellBoundQuotes[Math.floor(Math.random() * hellBoundQuotes.length)];
      setQuote(newRandomQuote);
    }, 4000); // Change quote every 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  // To prevent hydration mismatch, we render a placeholder on the server
  // and on the initial client render. The actual content is rendered only
  // after the component has mounted on the client.
  if (!isClient) {
    return <div className="h-10" />; // Placeholder to prevent layout shift
  }

  return (
    <div className="h-10 flex items-center justify-center">
      {quote && (
        <p key={quote} className={cn("text-muted-foreground italic text-center animate-in fade-in-500", className)}>
          &ldquo;{quote}&rdquo;
        </p>
      )}
    </div>
  );
}
