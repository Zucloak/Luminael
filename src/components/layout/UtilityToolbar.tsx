"use client";

import React from 'react';
import Draggable from 'react-draggable';
import { Wrench, BarChart2, Calculator as CalculatorIcon, BookOpen, Languages, GripVertical } from 'lucide-react';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calculator } from '../tools/Calculator';
import { GraphCreator } from '../tools/GraphCreator';
import { Dictionary } from '../tools/Dictionary';
import { Translator } from '../tools/Translator';

export function UtilityToolbar() {
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
  const nodeRef = React.useRef(null);

  return (
    <Draggable handle=".drag-handle" nodeRef={nodeRef}>
      <div ref={nodeRef} className="fixed top-1/2 -translate-y-1/2 right-4 z-50 cursor-move">
        <div className="flex items-center gap-0.5">
          <div className="drag-handle p-2 bg-secondary rounded-l-full hover:bg-muted cursor-grab active:cursor-grabbing" onMouseDown={stopPropagation}>
            <GripVertical className="h-6 w-6 text-muted-foreground" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="rounded-r-full h-12 w-12 shadow-lg"
                aria-label="Open Utility Tools"
              >
                <Wrench className="h-6 w-6 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" onMouseDown={stopPropagation}>
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
                <DialogContent className="max-w-md p-0 border-0">
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
        </div>
      </div>
    </Draggable>
  );
}
