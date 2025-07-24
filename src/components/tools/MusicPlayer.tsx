"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Music, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Plus, X, Upload, Download, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from '@/components/ui/slider';
import { useMusicPlayerContext } from '@/components/providers/MusicPlayerProvider';

const preInstalledSongs = [
    { title: 'Ambient Electronic Music for study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Upbeat Energetic Pop Rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { title: 'Relaxing Acoustic Guitar', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export function MusicPlayer() {
  const {
    playlist,
    currentSongIndex,
    isPlaying,
    isLooping,
    isShuffled,
    volume,
    currentSong,
    addSong,
    removeSong,
    playNext,
    playPrev,
    togglePlayPause,
    toggleLoop,
    toggleShuffle,
    setVolume,
    setCurrentSongIndex,
  } = useMusicPlayerContext();
  const [newSongUrl, setNewSongUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSong = () => {
    if (newSongUrl.trim() !== '') {
      addSong({
        title: newSongUrl,
        url: newSongUrl,
      });
      setNewSongUrl('');
    }
  };

  const handleExportPlaylist = () => {
    const json = JSON.stringify(playlist, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playlist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPlaylist = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const newPlaylist = JSON.parse(json);
          // Assuming you want to replace the current playlist
          // This needs to be implemented in the hook
        } catch (error) {
          console.error('Error parsing playlist file:', error);
        }
      };
      reader.readAsText(file);
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
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="pre-installed">Library</TabsTrigger>
            <TabsTrigger value="playlist">Playlist</TabsTrigger>
          </TabsList>
          <TabsContent value="queue">
            <ScrollArea className="h-40 w-full rounded-md border p-2">
              <ul>
                {playlist.map((song, index) => (
                  <li
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${index === currentSongIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    onClick={() => setCurrentSongIndex(index)}
                  >
                    <span>{song.title}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeSong(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="pre-installed">
            <ScrollArea className="h-40 w-full rounded-md border p-2">
              <ul>
                {preInstalledSongs.map((song, index) => (
                  <li
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted`}
                    onClick={() => {
                      addSong(song);
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
          </TabsContent>
          <TabsContent value="playlist">
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleImportPlaylist}
                />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleExportPlaylist}>
                    <Download className="h-4 w-4" />
                </Button>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex items-center gap-2">
          {volume === 0 ? <VolumeX className="h-6 w-6" /> : volume > 0.5 ? <Volume2 className="h-6 w-6" /> : <Volume1 className="h-6 w-6" />}
          <Slider
            value={[volume]}
            onValueChange={(value) => setVolume(value[0])}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
