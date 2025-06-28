"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
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
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ApiKeyDialog({ isHellBound = false }: { isHellBound?: boolean }) {
  const { apiKey, setApiKey, loading } = useApiKey();
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const { toast } = useToast();

  useEffect(() => {
    if (apiKey) {
      setKeyInput(apiKey);
    }
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(keyInput);
    toast({
      title: 'Key Assimilated',
      description: 'The new API Key is now active.',
    });
  };

  const isSupercharged = apiKey && !loading;

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) {
        setKeyInput(apiKey || "");
      }
    }}>
      <DialogTrigger asChild>
        {isSupercharged ? (
          <button className={cn(
            "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            "h-10 w-10 p-[2px] overflow-hidden bg-transparent"
          )}>
            <div className={cn(
                "absolute inset-0 -z-10",
                isHellBound
                    ? "bg-gradient-to-r from-amber-400 via-red-500 to-yellow-500"
                    : "bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400",
                "animate-supercharged-border bg-[length:400%_400%]"
            )} />
            <div className="flex h-full w-full items-center justify-center rounded-sm bg-background text-foreground hover:bg-accent hover:text-accent-foreground">
                <KeyRound className="h-5 w-5" />
            </div>
          </button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            aria-label="API Key Settings"
            className={cn(
              isHellBound && "text-foreground",
              !apiKey && !loading && "animate-blue-glow"
            )}
          >
            <KeyRound className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-[425px]", isHellBound && "hell-bound text-foreground")}>
        <DialogHeader>
          <DialogTitle>Gemini API Key</DialogTitle>
          <DialogDescription>
            Enter your Google AI Gemini API key here. It will be stored securely in your browser's local storage and never sent anywhere else.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="api-key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="col-span-3"
              placeholder="AIzaSy..."
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" onClick={handleSave}>Save changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
