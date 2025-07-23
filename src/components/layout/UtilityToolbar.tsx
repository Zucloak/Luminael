"use client";

import React, { useState, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Wrench, BarChart2, Calculator as CalculatorIcon, BookOpen, Languages, Music, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { eventBus } from '@/lib/event-bus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Calculator } from '../tools/Calculator';
import { GraphCreator } from '../tools/GraphCreator';
import { Dictionary } from '../tools/Dictionary';
import { Translator } from '../tools/Translator';
import { MusicPlayer } from '../tools/MusicPlayer';

export function UtilityToolbar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const controls = useAnimation();
  const dragControls = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStateChange = (data: any) => {
      setIsPlaying(data.isPlaying);
    };

    eventBus.on('music-player-state-change', handleStateChange);

    return () => {
      eventBus.off('music-player-state-change', handleStateChange);
    };
  }, []);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const viewportWidth = window.innerWidth;
    // The final position is the offset from the element's layout position.
    // Since we position with CSS (right-4), its initial "0" is near the right edge.
    const finalX = dragControls.current?.getBoundingClientRect().left || 0;

    if (finalX + (dragControls.current?.clientWidth || 0) / 2 < viewportWidth / 2) {
      // Snap left
      controls.start({ x: -(viewportWidth - 80) }); // Animate to ~20px from left
    } else {
      // Snap right
      controls.start({ x: 0 }); // Animate back to its original CSS position (right-4)
    }
  };

  return (
    <motion.div
      ref={dragControls}
      drag={true} // Allow dragging in any direction
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="fixed top-1/2 -translate-y-1/2 right-4 z-50 cursor-grab active:cursor-grabbing"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-full h-14 w-14 shadow-xl border flex items-center justify-center"
            aria-label="Open Utility Tools"
          >
            {isPlaying ? (
              <Disc className="h-7 w-7 text-primary animate-spin" />
            ) : (
              <Wrench className="h-7 w-7 text-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Utility Tools</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <BarChart2 className="mr-2 h-4 w-4" />
                <span>Graph Creator</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 border-0">
              <GraphCreator />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <CalculatorIcon className="mr-2 h-4 w-4" />
                <span>Calculator</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-0 border-0">
              <Calculator />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Dictionary</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0 border-0">
              <Dictionary />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Languages className="mr-2 h-4 w-4" />
                <span>Translator</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0 border-0">
              <Translator />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Music className="mr-2 h-4 w-4" />
                <span>Music Player</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-md p-0 border-0">
              <MusicPlayer />
            </DialogContent>
          </Dialog>

        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
