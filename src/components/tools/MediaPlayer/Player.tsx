"use client";

import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useMediaPlayer } from '@/hooks/use-media-player';

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
    seek,
  } = useMediaPlayer();

  const audioRef = React.useRef<HTMLAudioElement | null>(null); // Keep a ref to the global audio element if needed for seeking

  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    // We don't have direct access to the audio element anymore.
    // The persistent player will need a way to listen to seek commands.
    // A simple way is to have a dedicated state for seek requests.
    // For now, we'll just update the state, and the PersistentPlayer needs to handle it.

    // Let's add a seekTo function to the store.
    const { seekTo } = useMediaPlayer.getState();
    seekTo(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) {
        return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full flex items-center justify-between">
        <div className="text-sm">
          <p className="font-bold truncate max-w-[300px]">{currentTrack?.title || 'No track selected'}</p>
          <p className="text-muted-foreground">{currentTrack?.artist || '---'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleShuffle} className={isShuffling ? 'text-primary' : ''}>
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleLoop} className={isLooping ? 'text-primary' : ''}>
            <Repeat className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="w-full">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={1}
          onValueChange={handleSeek}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center space-x-4">
        <Button variant="ghost" size="icon" onClick={previous} disabled={!currentTrack}>
          <SkipBack className="h-6 w-6" />
        </Button>
        <Button variant="default" size="lg" className="rounded-full h-16 w-16" onClick={isPlaying ? pause : play} disabled={!currentTrack}>
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={next} disabled={!currentTrack}>
          <SkipForward className="h-6 w-6" />
        </Button>
      </div>
      <div className="w-full flex items-center justify-end space-x-2">
        <Button variant="ghost" size="icon" onClick={() => setVolume(volume > 0 ? 0 : 0.5)}>
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
  );
}
