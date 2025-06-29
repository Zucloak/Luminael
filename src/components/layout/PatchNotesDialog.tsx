
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
      <DialogContent className="w-[95vw] max-w-md flex flex-col p-0 max-h-[85vh] sm:max-h-[90vh] rounded-lg">
        <DialogHeader className="text-center items-center p-4 sm:p-6 pb-2 sm:pb-4 border-b">
            <div className="bg-primary/10 p-2 sm:p-3 rounded-full w-fit mb-2 sm:mb-3 border-2 sm:border-4 border-background outline outline-1 outline-border">
                <Zap className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
          <DialogTitle className="font-headline text-xl sm:text-2xl">{patch.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Version {patch.version} is now live! Here’s what’s new:
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 text-sm">
              {patch.notes.map((note, index) => (
                  <div key={index} className="flex items-start gap-3">
                  <div className="bg-muted p-1.5 rounded-full mt-1">
                      <note.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                      <p className="font-bold text-sm">{note.category}</p>
                      <p className="text-muted-foreground text-xs sm:text-sm">{note.text}</p>
                  </div>
                  </div>
              ))}
            </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            Got it, let's go!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
