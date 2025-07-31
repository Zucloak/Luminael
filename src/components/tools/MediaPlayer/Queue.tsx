"use client";

import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useMediaPlayer } from '@/hooks/use-media-player';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, cleanDuration } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Queue() {
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { queue, addToQueue, removeFromQueue, playTrack, currentTrackIndex, reorderQueue } = useMediaPlayer();
  const { toast } = useToast();

  const handleAddTrack = useCallback(async () => {
    if (!newTrackUrl || isAdding) return;

    setIsAdding(true);
    try {
      let trackData;
      if (newTrackUrl.includes('youtube.com') || newTrackUrl.includes('youtu.be')) {
        const videoId = newTrackUrl.split('v=')[1]?.split('&')[0] || newTrackUrl.split('/').pop();
        if (!videoId) throw new Error("Could not extract video ID from URL");

        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        if (!oembedResponse.ok) throw new Error("Failed to fetch video title");
        const oembedData = await oembedResponse.json();

        trackData = { id: videoId, title: oembedData.title, artist: oembedData.author_name, url: `https://www.youtube.com/embed/${videoId}`, duration: 0, sourceType: 'youtube' as 'youtube' };
      } else {
        const audioResponse = await fetch(newTrackUrl);
        const audioBlob = await audioResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        trackData = { id: newTrackUrl, title: newTrackUrl.split('/').pop() || 'Unknown Title', artist: 'Unknown Artist', url: audioUrl, duration: 0, sourceType: 'direct' as 'direct' };
      }
      addToQueue(trackData);
      setNewTrackUrl('');
    } catch (error) {
      console.error("Full error object:", error);
      toast({ title: "Error adding track", description: "Could not add track. Please check the link." });
    } finally {
      setIsAdding(false);
    }
  }, [newTrackUrl, isAdding, addToQueue, toast, setNewTrackUrl]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderQueue(result.source.index, result.destination.index);
  };

  const currentTrack = currentTrackIndex !== null && Array.isArray(queue) && queue[currentTrackIndex] ? queue[currentTrackIndex] : null;

  if (!Array.isArray(queue)) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4"><p>No tracks in queue.</p></div>;
  }

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
        <ScrollArea className="flex-grow h-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="queue">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1 pr-3">
                  {queue.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground"><p>The queue is empty.</p></div>
                  ) : (
                    queue.map((track, index) => {
                      if (!track) return null;
                      const truncatedTitle = track.title && track.title.length > 16 ? `${track.title.substring(0, 16)}...` : track.title;
                      return (
                        <Draggable key={track.id} draggableId={track.id} index={index}>
                          {(provided, snapshot) => {
                            const child = (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors group",
                                  currentTrack?.id === track.id ? "bg-accent" : "hover:bg-accent/50",
                                  snapshot.isDragging && "bg-accent/80 shadow-lg"
                                )}
                                onClick={() => playTrack(track.id)}
                                style={provided.draggableProps.style}
                              >
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <div className="flex items-center h-full cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                                  </div>
                                  <span className="text-xs font-mono w-5 text-center text-muted-foreground">{index + 1}</span>
                                  <div className="overflow-hidden">
                                    <Tooltip>
                                      <TooltipTrigger asChild><p className="text-xs font-medium truncate">{truncatedTitle || 'Untitled Track'}</p></TooltipTrigger>
                                      <TooltipContent sideOffset={10}><p>{track.title || 'Untitled Track'}</p></TooltipContent>
                                    </Tooltip>
                                    <p className="text-xs text-muted-foreground truncate">{track.artist || 'Unknown Artist'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 pl-2">
                                  <span className="text-xs text-muted-foreground font-mono">{cleanDuration(track.duration)}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-md hover:bg-destructive/20"
                                        onClick={(e) => { e.stopPropagation(); removeFromQueue(track.id); }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={10}><p>Remove from queue</p></TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            );

                            if (snapshot.isDragging) {
                              return ReactDOM.createPortal(child, document.body);
                            }
                            return child;
                          }}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
