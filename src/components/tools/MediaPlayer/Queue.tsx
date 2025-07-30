"use client";

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Trash2 } from 'lucide-react';
import { useMediaPlayer } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

export function Queue() {
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const { queue, addToQueue, removeFromQueue, playTrack, currentTrackIndex, loadQueue } = useMediaPlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddTrack = async () => {
    if (!newTrackUrl) return;

    try {
      let trackData;
      if (newTrackUrl.includes('youtube.com') || newTrackUrl.includes('youtu.be')) {
        const videoId = newTrackUrl.split('v=')[1]?.split('&')[0] || newTrackUrl.split('/').pop();
        const response = await fetch(`https://invidious.projectsegfau.lt/api/v1/videos/${videoId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video data. Status: ${response.status}`);
        }
        const data = await response.json();
        trackData = {
          id: data.videoId,
          title: data.title,
          artist: data.author,
          url: `https://invidious.projectsegfau.lt/latest_version?id=${videoId}&itag=18`, // itag 18 is standard mp4
          duration: data.lengthSeconds,
        };
      } else {
        // For direct media links, we can't get much metadata without playing it
        trackData = {
          id: newTrackUrl,
          title: newTrackUrl.split('/').pop() || 'Unknown Title',
          artist: 'Unknown Artist',
          url: newTrackUrl,
          duration: 0, // Will be updated on load
        };
      }
      addToQueue(trackData);
      setNewTrackUrl('');
    } catch (error) {
      console.error("Error adding track:", error);
      toast({
        title: "Error adding track",
        description: "Could not fetch track information. Please check the link or try another one.",
      });
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
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex space-x-2">
        <Input
          placeholder="Enter a media or YouTube link"
          value={newTrackUrl}
          onChange={(e) => setNewTrackUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
        />
        <Button onClick={handleAddTrack}>
          <Plus className="h-4 w-4" />
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
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportQueue} disabled={queue.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
      <ScrollArea className="flex-grow">
        <div className="space-y-2 pr-4">
            {queue.map((track, index) => (
            <div
                key={track.id}
                className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50",
                    currentTrack?.id === track.id && "bg-primary/10 text-primary"
                )}
                onClick={() => playTrack(track.id)}
            >
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold w-6 text-center">{index + 1}</span>
                    <div>
                        <p className="font-semibold truncate max-w-[250px]">{track.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{track.artist}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                        {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '-:--'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id)}}>
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
