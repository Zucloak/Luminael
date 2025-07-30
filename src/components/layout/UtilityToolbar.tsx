"use client";

import React from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Wrench, BarChart2, Calculator as CalculatorIcon, BookOpen, Languages, Music, HelpCircle, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calculator } from '../tools/Calculator';
import { GraphCreator } from '../tools/GraphCreator';
import { Dictionary } from '../tools/Dictionary';
import { Translator } from '../tools/Translator';
import { MediaPlayer } from '../tools/MediaPlayer';
import { useIsClient } from '@/hooks/use-is-client';
import { useQueueActions } from '@/hooks/use-queue-actions';

export function UtilityToolbar() {
  const controls = useAnimation();
  const dragControls = React.useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const { handleImportQueue, handleExportQueue } = useQueueActions();

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
      drag={true}
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
            <Wrench className="h-7 w-7 text-primary" />
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

          {isClient && (
            <Dialog>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Music className="mr-2 h-4 w-4" />
                  <span>Media Player</span>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="max-w-sm p-4 border-0">
                <DialogTitle className="flex justify-between items-center">
                  <span>Media Player</span>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleImportQueue || undefined}>
                            <Upload className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Import playlist</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportQueue || undefined}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export playlist</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Play and manage your audio queue. You can add tracks by URL or import/export your playlists as JSON files.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </DialogTitle>
                <MediaPlayer />
              </DialogContent>
            </Dialog>
          )}

        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
