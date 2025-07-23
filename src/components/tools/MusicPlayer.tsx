"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import { eventBus } from '@/lib/event-bus';

const songs = [
  { title: 'Ambient Electronic Music for study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'Upbeat Energetic Pop Rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Relaxing Acoustic Guitar', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export function MusicPlayer() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playlist, setPlaylist] = useState(songs);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentSong = playlist[currentSongIndex];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      } else {
        audioRef.current.pause();
      }
    }
    eventBus.dispatch('music-player-state-change', { isPlaying });
  }, [isPlaying, currentSongIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentSong.url;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
    }
  }, [currentSong]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  };

  const playPrev = () => {
    setCurrentSongIndex((prevIndex) => (prevIndex - 1 + playlist.length) % playlist.length);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const toggleShuffle = () => {
    const newIsShuffled = !isShuffled;
    setIsShuffled(newIsShuffled);

    if (newIsShuffled) {
      // Shuffle the playlist, but keep the current song at the top
      const newPlaylist = [...playlist];
      const currentSong = newPlaylist.splice(currentSongIndex, 1)[0];
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
      newPlaylist.unshift(currentSong);
      setPlaylist(newPlaylist);
      setCurrentSongIndex(0);
    } else {
      // Restore the original order
      const originalPlaylist = [...songs];
      const currentSongTitle = playlist[currentSongIndex].title;
      const originalIndex = originalPlaylist.findIndex(song => song.title === currentSongTitle);
      setPlaylist(originalPlaylist);
      setCurrentSongIndex(originalIndex);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-background">
      <style>{`
        .marquee {
          white-space: nowrap;
          overflow: hidden;
          position: relative;
        }
        .marquee span {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 10s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}</style>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Music className="mr-2" />
          Music Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="marquee">
            <p className="text-lg font-semibold">
              {currentSong.title.length > 30 ? <span>{currentSong.title}</span> : currentSong.title}
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center gap-4">
          <Button onClick={toggleShuffle} variant={isShuffled ? "secondary" : "ghost"} size="icon">
            <Shuffle className="h-6 w-6" />
          </Button>
          <Button onClick={playPrev} variant="ghost" size="icon">
            <SkipBack className="h-6 w-6" />
          </Button>
          <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-16 w-16">
            {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10" />}
          </Button>
          <Button onClick={playNext} variant="ghost" size="icon">
            <SkipForward className="h-6 w-6" />
          </Button>
          <Button onClick={toggleLoop} variant={isLooping ? "secondary" : "ghost"} size="icon">
            <Repeat className="h-6 w-6" />
          </Button>
        </div>
        <ScrollArea className="h-40 w-full rounded-md border p-2">
          <ul>
            {playlist.map((song, index) => (
              <li
                key={index}
                className={`p-2 rounded-md cursor-pointer ${index === currentSongIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setCurrentSongIndex(index)}
              >
                {song.title}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <audio
          ref={audioRef}
          src={currentSong.url}
          onEnded={playNext}
          loop={isLooping}
        />
      </CardContent>
    </Card>
  );
}
