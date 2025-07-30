"use client";

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMediaPlayer } from '@/hooks/use-media-player';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cleanDuration } from '@/lib/utils';
import YouTube from 'react-youtube';


export function Player() {
  const {
    isPlaying,
    isShuffling,
    isLooping,
    volume,
    currentTime,
    duration,
    currentTrackIndex,
    queue,
    play,
    pause,
    next,
    previous,
    toggleShuffle,
    toggleLoop,
    setVolume,
    seekTo,
  } = useMediaPlayer();

  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  const thumbnailUrl =
    currentTrack?.sourceType === 'youtube'
      ? `https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`
      : null;

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-background/80 backdrop-blur-lg rounded-2xl shadow-lg border border-border">
      <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
        {currentTrack?.sourceType === 'youtube' ? (
          <img
            src={`https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-muted-foreground">No track selected</p>
        )}
      </div>
      <div className="w-full flex items-center justify-between">
        <div className="text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-[250px] overflow-hidden">
                  <p className={`font-bold whitespace-nowrap ${currentTrack?.title && currentTrack.title.length > 34 ? 'animate-scroll' : ''}`}>{currentTrack?.title || 'No track selected'}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTrack?.title || 'No track selected'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-muted-foreground">{currentTrack?.artist || '---'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setVolume(volume > 0 ? 0 : 0.5)} className="hover:bg-accent">
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            className="w-24"
            onValueChange={(value) => setVolume(value[0])}
          />
        </div>
      </div>
      <div className="w-full">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={1}
          onValueChange={(value) => seekTo(value[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{cleanDuration(currentTime)}</span>
          <span>{cleanDuration(duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center space-x-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleShuffle} className={isShuffling ? 'bg-accent text-primary' : 'hover:bg-accent'}>
                <Shuffle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Shuffle</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button variant="ghost" size="icon" onClick={previous} disabled={!currentTrack} className="hover:bg-accent">
          <SkipBack className="h-6 w-6" />
        </Button>
        <Button variant="default" size="lg" className="rounded-full h-16 w-16" onClick={isPlaying ? pause : play} disabled={!currentTrack}>
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={next} disabled={!currentTrack} className="hover:bg-accent">
          <SkipForward className="h-6 w-6" />
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleLoop} className={isLooping ? 'bg-accent text-primary' : 'hover:bg-accent'}>
                <Repeat className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Loop</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
