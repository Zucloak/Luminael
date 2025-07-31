"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Player } from './Player';
import { Queue } from './Queue';
import { Library } from './Library';
import { QueueActionsContext } from '@/contexts/QueueActionsContext';
import { MediaPlayerHeader } from './Header';
import { useMediaPlayer, type Track } from '@/hooks/use-media-player';
import { useToast } from "@/components/ui/use-toast";
import { generateThumbnail, getYouTubeId } from '@/lib/utils';

export function MediaPlayer() {
  const { queue, loadQueue } = useMediaPlayer();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportQueue = useCallback(() => {
    if (queue.length === 0) {
      toast({ title: "Export Failed", description: "Cannot export an empty playlist." });
      return;
    }

    const exportableQueue = queue.map(track => ({
      title: track.title,
      url: track.url,
      thumbnail: generateThumbnail(track.url) || '',
      duration: track.duration,
      source: track.sourceType === 'youtube' ? 'YouTube' : 'Uploaded',
      id: track.id,
    }));

    const dataStr = JSON.stringify(exportableQueue, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = 'playlist-export.json';
    document.body.appendChild(linkElement);
    linkElement.click();

    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);

    toast({ title: "Playlist Exported", description: "Your playlist has been saved." });
  }, [queue, toast]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File could not be read as text.');
        }

        const importedQueue = JSON.parse(text);

        if (!Array.isArray(importedQueue)) {
          toast({ title: "Invalid Playlist File", description: "The file is not a valid playlist format (must be a JSON array)." });
          return;
        }

        const newQueue = importedQueue.map((track: any) => {
          if (!track || typeof track.title !== 'string' || typeof track.url !== 'string') {
            console.warn('Skipping invalid track object:', track);
            return null;
          }

          const source = track.source === "YouTube" ? "youtube" : "direct";
          let id = track.id;

          if (source === 'youtube' && !id) {
            id = getYouTubeId(track.url);
          }

          if (!id) {
            id = `${track.url}-${Date.now()}`;
          }

          const newTrack: Track = {
            id,
            title: track.title,
            artist: track.artist || 'Unknown Artist',
            url: track.url,
            duration: typeof track.duration === 'number' ? track.duration : 0,
            sourceType: source,
          };
          return newTrack;
        }).filter((track): track is Track => track !== null);

        if (newQueue.length > 0) {
            loadQueue(newQueue);
            toast({ title: "Playlist Imported", description: `Successfully loaded ${newQueue.length} tracks.` });
        } else if (importedQueue.length > 0) {
            toast({ title: "Invalid Playlist File", description: "No valid tracks were found in the file." });
        } else {
            toast({ title: "Empty Playlist", description: "The imported playlist is empty." });
        }

      } catch (error) {
        console.error("Error parsing queue file:", error);
        toast({ title: "Error Importing Playlist", description: "The file is not valid JSON." });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [loadQueue, toast]);

  const triggerImport = () => fileInputRef.current?.click();

  return (
    <QueueActionsContext.Provider value={{ handleImportQueue: triggerImport, handleExportQueue }}>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[384px] flex flex-col bg-background/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden text-foreground">
        <MediaPlayerHeader />
        <div className="flex flex-col overflow-hidden">
          <Tabs defaultValue="player" className="flex flex-col overflow-hidden">
            <TabsList className="mx-4 bg-transparent border-b border-border flex-shrink-0">
              <TabsTrigger value="player" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Player</TabsTrigger>
              <TabsTrigger value="queue" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Queue</TabsTrigger>
              <TabsTrigger value="library" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-none">Library</TabsTrigger>
            </TabsList>
            <TabsContent value="player" className="overflow-y-auto" style={{ height: '365.6px' }}>
                <Player />
            </TabsContent>
            <TabsContent value="queue" className="overflow-y-auto" style={{ height: '365.6px' }}>
              <Queue />
            </TabsContent>
            <TabsContent value="library" className="overflow-y-auto" style={{ height: '365.6px' }}>
              <Library />
            </TabsContent>
          </Tabs>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
        </div>
      </div>
    </QueueActionsContext.Provider>
  );
}
