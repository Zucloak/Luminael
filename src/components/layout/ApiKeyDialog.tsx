
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
import { useApiKey, KeyType, PaidTierConfig, UNLIMITED_BUDGET, FREE_TIER_BUDGET } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Link as LinkIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';

export function ApiKeyDialog({ isHellBound = false }: { isHellBound?: boolean }) {
  const { apiKey, setApiKey, clearApiKey, loading, keyType, paidTierConfig, usage, resetUsage, incrementUsage } = useApiKey();
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const [selectedType, setSelectedType] = useState<KeyType>(keyType);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const [isUnlimited, setIsUnlimited] = useState(paidTierConfig.type === 'unlimited');
  const [customLimit, setCustomLimit] = useState<string>(paidTierConfig.type === 'custom' && paidTierConfig.limit !== UNLIMITED_BUDGET ? String(paidTierConfig.limit) : '');


  useEffect(() => {
    // Sync local state when global state changes (e.g., on initial load)
    setKeyInput(apiKey || "");
    setSelectedType(keyType);
    setIsUnlimited(paidTierConfig.type === 'unlimited');
    setCustomLimit(paidTierConfig.type === 'custom' && paidTierConfig.limit !== UNLIMITED_BUDGET ? String(paidTierConfig.limit) : '');
  }, [apiKey, keyType, paidTierConfig]);
  
  // Reset local state when dialog is closed, to reflect the saved global state
  useEffect(() => {
    if (!isOpen) {
        setKeyInput(apiKey || "");
        setSelectedType(keyType);
        setIsUnlimited(paidTierConfig.type === 'unlimited');
        setCustomLimit(paidTierConfig.type === 'custom' && paidTierConfig.limit !== UNLIMITED_BUDGET ? String(paidTierConfig.limit) : '');
    }
  }, [isOpen, apiKey, keyType, paidTierConfig]);

  // When "unlimited" checkbox changes, update the customLimit input
  useEffect(() => {
    if (isUnlimited) {
      setCustomLimit('');
    }
  }, [isUnlimited]);
  
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

    const newPaidConfig: PaidTierConfig = {
      type: isUnlimited ? 'unlimited' : 'custom',
      limit: isUnlimited || !customLimit ? UNLIMITED_BUDGET : parseInt(customLimit, 10),
    };

    if (selectedType === 'paid' && newPaidConfig.type === 'custom' && (isNaN(newPaidConfig.limit) || newPaidConfig.limit <= 0)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Limit',
            description: 'Please enter a valid, positive number for the custom limit.',
        });
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
            setApiKey(trimmedKey, selectedType, newPaidConfig);
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

  // Real-time display logic
  const isDisplayingPaidUnlimited = selectedType === 'paid' && isUnlimited;
  
  const customLimitValue = parseInt(customLimit, 10);
  const displayTotal = isDisplayingPaidUnlimited
    ? UNLIMITED_BUDGET
    : selectedType === 'paid' && customLimitValue > 0
    ? customLimitValue
    : FREE_TIER_BUDGET;

  const usagePercentage = displayTotal > 0 ? Math.round((usage.used / displayTotal) * 100) : 0;

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
            Your API key is stored securely in your browser and never sent to our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
          <div className="space-y-2">
             <Label>Key Type</Label>
             <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as KeyType)} className="space-y-1">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="plan-free" />
                    <Label htmlFor="plan-free" className="font-normal">I'm using a free Gemini API key</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="plan-paid" />
                    <Label htmlFor="plan-paid" className="font-normal">I'm using a paid Gemini API key</Label>
                </div>
            </RadioGroup>
          </div>
          {selectedType === 'paid' && (
             <div className="space-y-3 pt-3 border-t animate-in fade-in-50 duration-300">
                <div className="flex items-center space-x-2">
                  <Checkbox id="unlimited-check" checked={isUnlimited} onCheckedChange={(checked) => setIsUnlimited(checked as boolean)} />
                  <label
                    htmlFor="unlimited-check"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use unlimited calls
                  </label>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="custom-limit" className={cn('text-xs', isUnlimited && 'text-muted-foreground/50')}>Custom Daily Limit</Label>
                    <Input id="custom-limit" type="number" placeholder='e.g., 1000' value={customLimit} onChange={e => setCustomLimit(e.target.value)} disabled={isUnlimited} className="h-9"/>
                 </div>
             </div>
          )}
          {isSupercharged && (
             <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between items-center text-sm">
                    <Label>Daily Usage Budget</Label>
                    {!isDisplayingPaidUnlimited ? (
                       <p className="font-medium text-muted-foreground">{usage.used} / {displayTotal} Calls</p>
                    ) : (
                       <p className="font-bold text-primary">Unlimited</p>
                    )}
                </div>
                {!isDisplayingPaidUnlimited && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Progress value={usagePercentage} className="h-2" indicatorClassName={cn(
                                    "bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-[length:200%_200%] animate-progress-fluid",
                                    usagePercentage > 50 && "from-yellow-400 via-yellow-500 to-orange-500",
                                    usagePercentage > 80 && "from-orange-500 via-red-500 to-red-600",
                                )}/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{usagePercentage}% of your daily {selectedType} tier budget used.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <a href="https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">See official quotas</a>
                    <Button variant="link" className="text-xs h-auto p-0" onClick={resetUsage}>Reset Count</Button>
                </div>
            </div>
          )}
          {!isSupercharged && (
            <div className="space-y-2 pt-2 text-sm text-muted-foreground">
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
        <DialogFooter className="pt-4">
           <Button type="button" onClick={handleSave} disabled={isVerifying}>
              {isVerifying ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
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
