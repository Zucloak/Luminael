"use client";

import { Wrench, BarChart2, Calculator, BookOpen, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

export function UtilityToolbar() {
  // In a future step, the dialogs for each tool will be triggered from these menu items.
  // For now, they are placeholders.

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-full h-12 w-12 shadow-lg hover:scale-110 transition-transform duration-200"
            aria-label="Open Utility Tools"
          >
            <Wrench className="h-6 w-6 text-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Utility Tools</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <BarChart2 className="mr-2 h-4 w-4" />
            <span>Graph Creator</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Calculator</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Dictionary</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Languages className="mr-2 h-4 w-4" />
            <span>Translator</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
