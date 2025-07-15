"use client";

import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Wrench, BarChart2, Calculator as CalculatorIcon, BookOpen, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function UtilityToolbar() {
  const controls = useAnimation();

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    const viewportWidth = window.innerWidth;
    const endX = info.point.x;

    // Snap to the closest edge (left or right)
    if (endX < viewportWidth / 2) {
      controls.start({ x: 20 - info.offset.x }); // Snap to 20px from left
    } else {
      controls.start({ x: viewportWidth - 76 - info.offset.x }); // Snap to 20px from right (76 = button width 56 + margin 20)
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ x: "calc(100vw - 76px)", y: "calc(50vh - 28px)" }} // Initial position middle-right
      className="fixed z-50 cursor-grab active:cursor-grabbing"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center"
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

        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
