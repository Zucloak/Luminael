import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Player } from './Player';
import { Queue } from './Queue';
import { Library } from './Library';

export function MediaPlayer() {
  return (
    <div className="flex flex-col h-[600px] bg-background">
      <div className="p-4 border-b">
        <Player />
      </div>
      <div className="flex-grow overflow-y-auto">
        <Tabs defaultValue="queue" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="flex-grow overflow-y-auto px-4">
            <Queue />
          </TabsContent>
          <TabsContent value="library" className="flex-grow overflow-y-auto px-4">
            <Library />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
