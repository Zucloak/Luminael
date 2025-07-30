"use client";

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { useMediaPlayer } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, cleanDuration } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

export function Queue() {
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
    const dataStr = JSON.stringify(queue, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'luminael_playlist.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportQueue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const importedQueue = JSON.parse(text);
          // Basic validation
          if (Array.isArray(importedQueue) && importedQueue.every(t => t.id && t.title && t.url)) {
            loadQueue(importedQueue);
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

  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  return (
    <div className="space-y-4 h-full flex flex-col p-4">
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
      <div className="flex justify-end space-x-2">
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleImportQueue}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportQueue} disabled={queue.length === 0} className="rounded-xl">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
      <ScrollArea className="flex-grow -mr-4">
        <div className="space-y-2 pr-4">
            {queue.map((track, index) => (
            <div
                key={`${track.id}-${index}`}
                className={cn(
                    "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors",
                    currentTrack?.id === track.id ? "bg-accent" : "hover:bg-accent/50"
                )}
                onClick={() => playTrack(track.id)}
            >
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold w-6 text-center text-muted-foreground">{index + 1}</span>
                    <div>
                        <p className="font-semibold truncate max-w-[250px]">{track.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{track.artist}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                        {cleanDuration(track.duration)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id)}}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
