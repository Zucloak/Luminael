'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const normalQuotes = [
  "Assembling insights from your materials...",
  "Connecting the dots within your content...",
  "Synthesizing key concepts...",
  "Drafting questions to challenge your understanding...",
  "The AI is turning information into knowledge...",
  "Building a bridge between your notes and new questions...",
  "Distilling the essence of your documents...",
  "Curating a personalized learning experience...",
  "Analyzing patterns in the text...",
  "The AI is formulating thought-provoking questions...",
  "Structuring your custom quiz...",
  "Reviewing your content for quiz-worthy material...",
  "Crafting questions to test your recall and comprehension...",
  "Just a moment while we build your path to mastery...",
  "The digital gears of knowledge are turning...",
  "Organizing concepts for your quiz...",
  "Identifying the most important information...",
  "Preparing your intellectual workout...",
  "Translating your content into a learning opportunity...",
  "Our AI is reading so you can learn faster...",
  "Generating pathways to deeper understanding...",
  "Weaving together questions from your provided text...",
  "Uncovering the core ideas for your quiz...",
  "Building your personalized assessment...",
  "Aligning questions with your study material...",
  "Constructing a fair and balanced set of questions...",
  "Almost ready to test your expertise...",
  "The AI is on the case, creating your quiz...",
  "From text to test, the process is underway...",
  "Filtering for the most relevant topics...",
  "Finalizing the question set...",
  "Polishing the questions for clarity...",
  "Every great quiz starts with great content. Analyzing yours now...",
];

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
  mode?: 'normal' | 'hellBound';
}

export function LoadingQuotes({ className, mode = 'hellBound' }: LoadingQuotesProps) {
  const [quote, setQuote] = useState('');
  const [isClient, setIsClient] = useState(false);
  const quotes = mode === 'hellBound' ? hellBoundQuotes : normalQuotes;

  useEffect(() => {
    setIsClient(true);
    // Set initial quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);

    const intervalId = setInterval(() => {
      const newRandomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setQuote(newRandomQuote);
    }, 4000); // Change quote every 4 seconds

    return () => clearInterval(intervalId);
  }, [quotes]);

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
