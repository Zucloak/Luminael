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
              isHellBound && "text-foreground",
              !apiKey && !loading
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
