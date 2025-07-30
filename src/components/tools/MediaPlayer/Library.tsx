"use client";

import React, { useState, useEffect } from 'react';
import { useMediaPlayer, type Track } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function Library() {
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const { addToQueue } = useMediaPlayer();

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch('/library.json');
        const data = await response.json();
        setLibraryTracks(data);
      } catch (error) {
        console.error("Error fetching library:", error);
      }
    };

    fetchLibrary();
  }, []);

  return (
    <ScrollArea className="h-full">
        <div className="space-y-2 pr-4">
            {libraryTracks.map((track) => (
                <div
                    key={track.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                >
                    <div className="flex items-center space-x-3">
                        <div>
                            <p className="font-semibold truncate max-w-[250px]">{track.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{track.artist}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '-:--'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addToQueue(track)}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    </ScrollArea>
  );
}
