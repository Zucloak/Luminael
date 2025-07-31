"use client";

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Player } from './Player';
import { Queue } from './Queue';
import { Library } from './Library';
import { QueueActionsContext } from '@/contexts/QueueActionsContext';
import { MediaPlayerHeader } from './Header';

export function MediaPlayer() {
  const [handleImportQueue, setHandleImportQueue] = useState<(() => void) | null>(null);
  const [handleExportQueue, setHandleExportQueue] = useState<(() => void) | null>(null);

  const setImportHandler = useCallback((handler: () => void) => {
    setHandleImportQueue(() => handler);
  }, []);

  const setExportHandler = useCallback((handler: () => void) => {
    setHandleExportQueue(() => handler);
  }, []);

  return (
    <QueueActionsContext.Provider value={{ handleImportQueue, handleExportQueue }}>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[384px] flex flex-col bg-background/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden text-foreground">
        <MediaPlayerHeader />
        <div className="flex flex-col overflow-hidden">
          <Tabs defaultValue="player" className="flex flex-col overflow-hidden">
            <TabsList className="mx-4 bg-transparent border-b border-border flex-shrink-0">
              <TabsTrigger value="player" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Player</TabsTrigger>
              <TabsTrigger value="queue" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Queue</TabsTrigger>
              <TabsTrigger value="library" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Library</TabsTrigger>
            </TabsList>
            <TabsContent value="player" className="overflow-y-auto" style={{ maxHeight: '365.6px' }}>
                <Player />
            </TabsContent>
            <TabsContent value="queue" className="overflow-y-auto" style={{ maxHeight: '365.6px' }}>
              <Queue
                setHandleImportQueue={setImportHandler}
                setHandleExportQueue={setExportHandler}
              />
            </TabsContent>
            <TabsContent value="library" className="overflow-y-auto" style={{ maxHeight: '365.6px' }}>
              <Library />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </QueueActionsContext.Provider>
  );
}
