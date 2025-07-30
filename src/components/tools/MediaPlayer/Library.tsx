"use client";

import React, { useState, useEffect } from 'react';
import { useMediaPlayer } from '@/hooks/use-media-player';
import type { Track } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Library() {
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const { addToQueue, queue, currentTrackIndex } = useMediaPlayer();

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch('/library.json');
        const data = await response.json();
        setLibraryTracks(data.map((track: any) => ({ ...track, sourceType: 'direct' })));
      } catch (error) {
        console.error("Error fetching library:", error);
      }
    };

    fetchLibrary();
  }, []);

  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  return (
    <ScrollArea className="h-full px-4">
        <div className="space-y-2 pr-4">
            {libraryTracks.map((track, index) => (
                <div
                    key={`${track.id}-${index}`}
                    className={cn(
                        "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors",
                        currentTrack?.id === track.id ? "bg-white/20" : "hover:bg-white/10"
                    )}
                    onClick={() => addToQueue(track)}
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
                            {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '-:--'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/20">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    </ScrollArea>
  );
}
