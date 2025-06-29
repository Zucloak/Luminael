
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { BrainCircuit, Sparkles, ShieldCheck, Mail, History, KeyRound } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { patchNotes } from '@/lib/patch-notes';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProfilePage() {
  const { isHellBound, loading: themeLoading } = useTheme();

  const loading = themeLoading;

  if (loading) {
    return (
      <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000", isHellBound && "hell-bound")}>
        <Header isHellBound={isHellBound} />
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Card className="max-w-2xl mx-auto w-full">
            <CardHeader>
              <Skeleton className="h-8 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </main>
        <footer className="text-center p-4 text-sm text-muted-foreground">
            <p>
            A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
            </p>
        </footer>
      </div>
    );
  }

  return (
    <div className={cn("theme-container min-h-screen flex flex-col transition-colors duration-1000", isHellBound && "hell-bound")}>
      <Header isHellBound={isHellBound} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
        <div className="relative w-full max-w-2xl mx-auto">
          {isHellBound && (
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 opacity-60 animate-supercharged-border bg-[length:400%_400%]" />
          )}
          <Card className={cn(
              "w-full relative",
              isHellBound ? "bg-card/80 backdrop-blur-sm border-0" : "shadow-lg"
            )}>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Welcome, Pioneer!</CardTitle>
              <CardDescription>
                You're at the forefront of AI-powered learning. Here's what's new and how we're building a smarter tool for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> The Luminael Method</h3>
                    <div className="p-4 rounded-md border bg-muted/30 space-y-4">
                        <div className="flex items-start gap-3">
                            <BrainCircuit className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                            <div>
                                <h4 className="font-semibold">Intelligent Content Processing</h4>
                                <p className="text-sm text-muted-foreground">Luminael uses a hybrid approach to understand your files. We use powerful on-device processing first, only calling on advanced AI when necessary. This saves your Gemini API quota while delivering fast, accurate results.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                            <div>
                                <h4 className="font-semibold">Your Privacy is Paramount</h4>
                                <p className="text-sm text-muted-foreground">Your API key is stored exclusively in your browser—never on our servers. Uploaded study materials are processed for your quiz and then immediately discarded. Your data is yours alone.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> The Key to Your Engine</h3>
                     <div className="p-4 rounded-md border bg-muted/30">
                        <p className="text-sm text-muted-foreground">Think of Luminael as a high-performance vehicle, engineered to perfection. Your free Google Gemini API key is the only thing needed to get in the driver's seat and unlock its full potential. The generous free tier is more than enough to get you started on the road to mastery.</p>
                        <p className="text-sm mt-2">
                           <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary">Get your free API Key and start your engine.</a>
                        </p>
                     </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> You are a Beta Tester</h3>
                     <div className="p-4 rounded-md border bg-muted/30">
                        <p className="text-sm text-muted-foreground">Your feedback is critical as we build the future of personalized education. If you find a bug or have a suggestion, please let us know.</p>
                        <p className="text-sm mt-2">
                           Send bug reports to: <a href="mailto:synpps@gmail.com" className="font-semibold underline hover:text-primary">synpps@gmail.com</a>
                        </p>
                     </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Version History</h3>
                    <Card className="w-full bg-background/50">
                        <CardContent className="p-0">
                            <ScrollArea className="h-72 w-full">
                                <Accordion type="single" collapsible defaultValue="item-0" className="p-4">
                                    {patchNotes.map((patch, index) => (
                                        <AccordionItem value={`item-${index}`} key={patch.version}>
                                            <AccordionTrigger>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold">Version {patch.version}: {patch.title}</span>
                                                    <span className="text-xs text-muted-foreground">{patch.date}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="space-y-3 pt-2">
                                                    {patch.notes.map((note, noteIndex) => (
                                                        <li key={noteIndex} className="flex items-start gap-3">
                                                            <div className="bg-muted p-1.5 rounded-full mt-1">
                                                                <note.icon className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                            <p className="text-sm text-muted-foreground flex-1"><span className="font-semibold text-foreground">{note.category}:</span> {note.text}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
        </p>
      </footer>
    </div>
  );
}
