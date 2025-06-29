
"use client";

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function ApiKeyDialog({ isHellBound = false }: { isHellBound?: boolean }) {
  const { apiKey, setApiKey, clearApiKey, loading, usage, resetUsage } = useApiKey();
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const { toast } = useToast();

  useEffect(() => {
    if (apiKey) {
      setKeyInput(apiKey);
    } else {
      setKeyInput("");
    }
  }, [apiKey]);

  const handleSave = () => {
    const trimmedKey = keyInput.trim();
    if (trimmedKey) {
        setApiKey(trimmedKey);
        toast({
            title: 'Key Assimilated',
            description: 'The new API Key is now active.',
        });
    } else {
        clearApiKey();
        toast({
            title: 'API Key Removed',
            description: 'Your API key has been cleared.',
            variant: 'destructive'
        });
    }
  };

  const isSupercharged = apiKey && !loading;
  const usagePercentage = Math.round((usage.used / usage.total) * 100);

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) {
        setKeyInput(apiKey || "");
      }
    }}>
      <DialogTrigger asChild>
        {isSupercharged ? (
           <Button
            variant="supercharged"
            size="icon"
            aria-label="API Key Settings"
            className={cn(
              isHellBound
                ? "bg-gradient-to-r from-amber-400 via-red-500 to-yellow-500"
                : "bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400",
              "animate-supercharged-border bg-[length:400%_400%]"
            )}
          >
            <KeyRound className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            aria-label="API Key Settings"
            className={cn(
              "relative",
              isHellBound && "text-foreground"
            )}
          >
            <KeyRound className="h-5 w-5" />
            {!apiKey && !loading && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-md", isHellBound && "hell-bound text-foreground")}>
        <DialogHeader>
          <DialogTitle>Gemini API Key</DialogTitle>
          <DialogDescription>
            Enter your Google AI Gemini API key here. It will be stored securely in your browser's local storage and never sent anywhere else.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">
              API Key
            </Label>
            <Input
              id="api-key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              type="password"
            />
          </div>
          {isSupercharged && (
             <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-end">
                    <Label>Daily Usage Budget</Label>
                    <p className="text-sm font-medium text-muted-foreground">{usage.used} / {usage.total} Calls</p>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Progress value={usagePercentage} className="h-3" indicatorClassName={cn(
                                "bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-[length:200%_200%] animate-progress-fluid",
                                usagePercentage > 50 && "from-yellow-400 via-yellow-500 to-orange-500",
                                usagePercentage > 80 && "from-orange-500 via-red-500 to-red-600",
                            )}/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{usagePercentage}% of your suggested daily budget used.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <a href="https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">See official Google quotas</a>
                    <Button variant="link" className="text-xs h-auto p-0" onClick={resetUsage}>Reset Count</Button>
                </div>
            </div>
          )}
          {!isSupercharged && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="text-sm hover:no-underline py-2">Where can I find my Gemini API key?</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2 text-sm text-muted-foreground">
                  <p>
                    You can create a free API key from Google AI Studio. The free tier is generous and perfect for getting started.
                  </p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline' }), "w-full")}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Get your API Key from Google AI Studio
                  </a>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" onClick={handleSave}>Save changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
