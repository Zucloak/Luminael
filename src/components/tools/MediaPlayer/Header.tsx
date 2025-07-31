"use client";

import React, { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { QueueActionsContext } from '@/contexts/QueueActionsContext';
import { useMediaPlayer } from '@/hooks/use-media-player';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MediaPlayerHeader() {
  const { handleImportQueue, handleExportQueue } = useContext(QueueActionsContext);
  const { queue } = useMediaPlayer();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Media Player</h2>
        <div className="flex space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleImportQueue || undefined} className="rounded-xl">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={10}>
                <p>Import a playlist from a JSON file.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportQueue || undefined} disabled={queue.length === 0} className="rounded-xl">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={10}>
                <p>Export the current playlist to a JSON file.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
