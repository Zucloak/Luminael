"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import getYouTubeTitle from 'get-youtube-title';
import { Music, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Plus, X, Library } from 'lucide-react';
import { eventBus } from '@/lib/event-bus';

const preInstalledSongs = [
    { title: 'Ambient Electronic Music for study', url: '/music/SoundHelix-Song-1.mp3' },
    { title: 'Upbeat Energetic Pop Rock', url: '/music/SoundHelix-Song-2.mp3' },
    { title: 'Relaxing Acoustic Guitar', url: '/music/SoundHelix-Song-3.mp3' },
];

export function MusicPlayer() {
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playlist, setPlaylist] = useState<{title: string, url: string}[]>([]);
  const [newSongUrl, setNewSongUrl] = useState('');
  const [showPreInstalled, setShowPreInstalled] = useState(false);

  const currentSong = playlist[currentSongIndex];

  useEffect(() => {
    eventBus.dispatch('music-player-state-change', { isPlaying });
  }, [isPlaying]);

  const handleAddSong = async () => {
    if (newSongUrl.trim() !== '') {
      let title = newSongUrl;
      if (newSongUrl.includes('youtube.com') || newSongUrl.includes('youtu.be')) {
        const videoId = newSongUrl.split('v=')[1] || newSongUrl.split('/').pop();
        if (videoId) {
            title = await new Promise((resolve) => {
                getYouTubeTitle(videoId, (err: any, title: any) => {
                    if (err) {
                        console.error(err);
                        resolve(newSongUrl);
                    }
                    resolve(title);
                });
            });
        }
      }
      const newSong = {
        title: title,
        url: newSongUrl,
      };
      setPlaylist([...playlist, newSong]);
      setNewSongUrl('');
    }
  };

  const handleRemoveSong = (index: number) => {
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    setPlaylist(newPlaylist);
  };

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
      const originalPlaylist = [...preInstalledSongs];
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
              {currentSong ? (currentSong.title.length > 30 ? <span>{currentSong.title}</span> : currentSong.title) : 'No song selected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Input
                type="text"
                placeholder="Enter song URL (e.g., YouTube)"
                value={newSongUrl}
                onChange={(e) => setNewSongUrl(e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={handleAddSong}>
                <Plus className="h-6 w-6" />
            </Button>
        </div>
        <div className="flex justify-center items-center gap-4">
            <Button onClick={() => setShowPreInstalled(!showPreInstalled)} variant="ghost" size="icon">
                <Library className="h-6 w-6" />
            </Button>
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
        {showPreInstalled && (
            <ScrollArea className="h-40 w-full rounded-md border p-2">
                <ul>
                    {preInstalledSongs.map((song, index) => (
                        <li
                            key={index}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted`}
                            onClick={() => {
                                setPlaylist([...playlist, song]);
                            }}
                        >
                            <span>{song.title}</span>
                            <Button variant="ghost" size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        )}
        <ScrollArea className="h-40 w-full rounded-md border p-2">
          <ul>
            {playlist.map((song, index) => (
              <li
                key={index}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${index === currentSongIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setCurrentSongIndex(index)}
              >
                <span>{song.title}</span>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveSong(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <audio
          src={currentSong?.url}
          autoPlay={isPlaying}
          loop={isLooping}
          onEnded={playNext}
        />
      </CardContent>
    </Card>
  );
}
