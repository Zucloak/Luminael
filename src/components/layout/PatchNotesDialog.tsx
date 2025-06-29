"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PatchVersion } from "@/lib/patch-notes";
import { Zap } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface PatchNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patch: PatchVersion;
}

export function PatchNotesDialog({ isOpen, onClose, patch }: PatchNotesDialogProps) {
  if (!patch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center items-center">
            <div className="bg-primary/10 p-3 rounded-full w-fit mb-3 border-4 border-background outline outline-1 outline-border">
                <Zap className="h-8 w-8 text-primary" />
            </div>
          <DialogTitle className="font-headline text-3xl">{patch.title}</DialogTitle>
          <DialogDescription className="text-base">
            Version {patch.version} is now live! Here’s what’s new:
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-6 -mr-6 mt-4">
            <div className="space-y-4">
            {patch.notes.map((note, index) => (
                <div key={index} className="flex items-start gap-4">
                <div className="bg-muted p-2 rounded-full">
                    <note.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                    <p className="font-bold">{note.category}</p>
                    <p className="text-muted-foreground">{note.text}</p>
                </div>
                </div>
            ))}
            </div>
        </ScrollArea>
        <DialogFooter className="mt-6">
          <Button onClick={onClose} className="w-full">
            Got it, let's go!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
