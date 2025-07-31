"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Player } from './Player';
import { Queue } from './Queue';
import { Library } from './Library';
import { QueueActionsContext } from '@/contexts/QueueActionsContext';
import { useState } from 'react';

export function MediaPlayer() {
  const [handleImportQueue, setHandleImportQueue] = useState<(() => void) | null>(null);
  const [handleExportQueue, setHandleExportQueue] = useState<(() => void) | null>(null);

  return (
    <QueueActionsContext.Provider value={{ handleImportQueue, handleExportQueue }}>
      <div className="flex flex-col h-[600px] bg-background/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden text-foreground">
        <div className="p-4">
          <Player />
        </div>
        <div className="flex-grow overflow-y-auto">
          <Tabs defaultValue="queue" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-2 bg-transparent border-b border-border">
              <TabsTrigger value="queue" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Queue</TabsTrigger>
              <TabsTrigger value="library" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Library</TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="flex-grow overflow-y-auto">
              <Queue
                setHandleImportQueue={setHandleImportQueue}
                setHandleExportQueue={setHandleExportQueue}
              />
            </TabsContent>
            <TabsContent value="library" className="flex-grow overflow-y-auto">
              <Library />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </QueueActionsContext.Provider>
  );
}
