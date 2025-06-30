
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKey, KeyType } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Link as LinkIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function ApiKeyDialog({ isHellBound = false }: { isHellBound?: boolean }) {
  const { apiKey, setApiKey, clearApiKey, loading, keyType, usage, resetUsage, incrementUsage } = useApiKey();
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const [selectedType, setSelectedType] = useState<KeyType>(keyType);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (apiKey) {
      setKeyInput(apiKey);
    } else {
      setKeyInput("");
    }
    setSelectedType(keyType);
  }, [apiKey, keyType]);

  useEffect(() => {
    if (!isOpen) {
        setKeyInput(apiKey || "");
        setSelectedType(keyType);
    }
  }, [isOpen, apiKey, keyType]);

  const handleSave = async () => {
    const trimmedKey = keyInput.trim();
    
    if (!trimmedKey) {
        clearApiKey();
        toast({
            title: 'API Key Removed',
            description: 'Your API key has been cleared.',
            variant: 'destructive'
        });
        setIsOpen(false);
        return;
    }

    setIsVerifying(true);
    try {
        const response = await fetch('/api/validate-api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: trimmedKey }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            setApiKey(trimmedKey, selectedType);
            incrementUsage(); // Account for the validation call
            toast({
                title: 'Key Verified & Assimilated',
                description: 'The new API Key is valid and now active.',
            });
            setIsOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Verification Failed',
                description: result.error || 'The provided API key is invalid. Please check it and try again.',
            });
        }
    } catch (error) {
        console.error("API Key validation request failed", error);
        toast({
            variant: 'destructive',
            title: 'Verification Error',
            description: 'Could not connect to the server to verify the key. Please check your connection.',
        });
    } finally {
        setIsVerifying(false);
    }
  };

  const isSupercharged = apiKey && !loading;
  const usagePercentage = Math.round((usage.used / usage.total) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Enter your Google AI Gemini API key and select your plan type.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              type="password"
              disabled={isVerifying}
              maxLength={39}
            />
          </div>
          <div className="space-y-3">
             <Label>Plan Type</Label>
             <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as KeyType)} className="grid grid-cols-2 gap-4">
                <div>
                    <RadioGroupItem value="free" id="plan-free" className="peer sr-only" />
                    <Label
                        htmlFor="plan-free"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        Free Tier
                        <span className="text-xs font-normal text-muted-foreground">50 calls/day</span>
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="paid" id="plan-paid" className="peer sr-only" />
                    <Label
                        htmlFor="plan-paid"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        Paid Plan
                         <span className="text-xs font-normal text-muted-foreground">Higher Limits</span>
                    </Label>
                </div>
            </RadioGroup>
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
                            <p>{usagePercentage}% of your daily {keyType} tier budget used.</p>
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
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
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
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
           <Button type="button" onClick={handleSave} disabled={isVerifying}>
              {isVerifying ? (
                  <>
                      <Loader2 className="animate-spin" /> Verifying...
                  </>
              ) : (
                  "Save and Verify"
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
