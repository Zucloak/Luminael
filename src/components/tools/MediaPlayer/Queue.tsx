"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { useMediaPlayer } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, cleanDuration } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QueueProps {
  setHandleImportQueue: (handler: () => void) => void;
  setHandleExportQueue: (handler: () => void) => void;
}

export function Queue({ setHandleImportQueue, setHandleExportQueue }: QueueProps) {
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { queue, addToQueue, removeFromQueue, playTrack, currentTrackIndex, loadQueue } = useMediaPlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddTrack = async () => {
    if (!newTrackUrl || isAdding) return;

    setIsAdding(true);
    console.log("Attempting to add track:", newTrackUrl);

    try {
      let trackData;
      if (newTrackUrl.includes('youtube.com') || newTrackUrl.includes('youtu.be')) {
        const videoId = newTrackUrl.split('v=')[1]?.split('&')[0] || newTrackUrl.split('/').pop();
        if (!videoId) {
            throw new Error("Could not extract video ID from URL");
        }

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        if (!oembedResponse.ok) {
            throw new Error("Failed to fetch video title");
        }
        const oembedData = await oembedResponse.json();

        trackData = {
          id: videoId,
          title: oembedData.title,
          artist: oembedData.author_name,
          url: `https://www.youtube.com/embed/${videoId}`,
          duration: 0, // Cannot get duration without API
          sourceType: 'youtube' as 'youtube',
        };
      } else {
        const audioResponse = await fetch(newTrackUrl);
        const audioBlob = await audioResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        trackData = {
          id: newTrackUrl,
          title: newTrackUrl.split('/').pop() || 'Unknown Title',
          artist: 'Unknown Artist',
          url: audioUrl,
          duration: 0, // Will be updated on load
          sourceType: 'direct' as 'direct',
        };
      }
      addToQueue(trackData);
      setNewTrackUrl('');
    } catch (error) {
        console.error("Full error object:", error);
        toast({
            title: "Error adding track",
            description: "Could not add track. Please check the link.",
        });
    } finally {
        setIsAdding(false);
    }
  };

  const handleExportQueue = () => {
    if (queue.length === 0) {
        toast({
            title: "Export Failed",
            description: "Cannot export an empty playlist.",
        });
        return;
    }
    const dataStr = JSON.stringify(queue, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'luminael_playlist.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const importedQueue = JSON.parse(text);
          if (Array.isArray(importedQueue) && importedQueue.every(t => t.id && t.title && t.url)) {
            loadQueue(importedQueue);
            toast({
                title: "Playlist Imported",
                description: "Your playlist has been loaded successfully.",
            });
          } else {
            toast({
                title: "Invalid Playlist File",
                description: "The selected file is not a valid Luminael playlist.",
            });
          }
        }
      } catch (error) {
        console.error("Error parsing queue file:", error);
        toast({
            title: "Error Importing Playlist",
            description: "There was an error reading the playlist file.",
        });
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    setHandleImportQueue(() => triggerImport);
    setHandleExportQueue(() => handleExportQueue);
  }, [setHandleImportQueue, setHandleExportQueue, handleExportQueue]);


  const currentTrack = currentTrackIndex !== null && Array.isArray(queue) && queue[currentTrackIndex] ? queue[currentTrackIndex] : null;

  // Final, definitive guard as per instructions.
  if (!Array.isArray(queue)) {
    console.log('Rendering queue: The queue is not a valid array.', queue);
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4"><p>No tracks in queue.</p></div>;
  }

  console.log('Rendering queue:', queue);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2 h-full flex flex-col p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Enter a media or YouTube link"
            value={newTrackUrl}
            onChange={(e) => setNewTrackUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
            className="bg-background/80 border-border rounded-xl focus:ring-primary"
          />
          <Button onClick={handleAddTrack} disabled={isAdding} className="rounded-xl">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
        />
        <ScrollArea className="flex-grow h-0">
          <div className="space-y-1 pr-3">
            {queue.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                <p>The queue is empty.</p>
              </div>
            ) : (
              queue.map((track, index) => {
                if (!track) {
                  return null; // Defensive check for null/undefined tracks
                }
                return (
                  <div
                    key={track.id || `track-${index}`} // More robust key
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors",
                      currentTrack?.id === track.id
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => playTrack(track.id)}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <span className="text-xs font-mono w-5 text-center text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="overflow-hidden">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs font-medium truncate">
                              {track.title || 'Untitled Track'}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={10}>
                            <p>{track.title || 'Untitled Track'}</p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 pl-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {cleanDuration(track.duration)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(track.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={10}>
                          <p>Remove from queue</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
