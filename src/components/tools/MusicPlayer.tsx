"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Music, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Plus, Upload, Download, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from '@/components/ui/slider';
import { useMusicPlayerContext } from '@/components/providers/MusicPlayerProvider';
import { toast } from '@/hooks/use-toast';

const preInstalledSongs = [
    { title: 'Ambient Electronic Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Upbeat Pop Rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { title: 'Relaxing Acoustic Guitar', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export function MusicPlayer() {
    const { playerRef, ...musicPlayer } = useMusicPlayerContext();
    const [newSongUrl, setNewSongUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddSongFromUrl = useCallback(async () => {
        if (newSongUrl.trim() !== '') {
            try {
                const response = await fetch(`/api/audio/youtube-title?url=${encodeURIComponent(newSongUrl)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch song title');
                }
                const { title } = await response.json();
                musicPlayer.addSong({ title, url: newSongUrl });
                setNewSongUrl('');
                toast({ title: "Song Added", description: "The song has been added to your queue." });
            } catch (error) {
                console.error('Error adding song:', error);
                // Fallback to adding with URL as title
                musicPlayer.addSong({ title: newSongUrl, url: newSongUrl });
                setNewSongUrl('');
                toast({ title: "Song Added", description: "Could not fetch title, using URL.", variant: "destructive" });
            }
        }
    }, [newSongUrl, musicPlayer]);

    const handleAddPreinstalledSong = useCallback((song: { title: string; url: string }) => {
        musicPlayer.addSong(song);
        toast({ title: "Song Added", description: `${song.title} has been added to your queue.` });
    }, [musicPlayer]);

    const handleSelectSong = useCallback((index: number) => {
        musicPlayer.setCurrentSongIndex(index);
    }, [musicPlayer]);

    const handleRemoveSong = useCallback((e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        musicPlayer.removeSong(index);
        toast({ title: "Song Removed", description: "The song has been removed from your queue." });
    }, [musicPlayer]);

    const handleExportPlaylist = useCallback(() => {
        if (musicPlayer.playlist.length === 0) {
            toast({ title: "Export Failed", description: "Your playlist is empty.", variant: "destructive" });
            return;
        }
        const json = JSON.stringify(musicPlayer.playlist, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lumina-playlist.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Playlist Exported", description: "Your playlist has been saved." });
    }, [musicPlayer.playlist]);

    const handleImportPlaylist = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = e.target?.result as string;
                    const newPlaylist = JSON.parse(json);
                    if (Array.isArray(newPlaylist)) {
                        // Simple validation, can be improved
                        newPlaylist.forEach(song => musicPlayer.addSong(song));
                        toast({ title: "Playlist Imported", description: "Songs have been added to your playlist." });
                    } else {
                        throw new Error("Invalid playlist format.");
                    }
                } catch (error) {
                    console.error('Error parsing playlist file:', error);
                    toast({ title: "Import Failed", description: "The selected file is not a valid playlist.", variant: "destructive" });
                }
            };
            reader.readAsText(file);
        }
    }, [musicPlayer]);

    const handleVolumeChange = (value: number[]) => {
        musicPlayer.setVolume(value[0]);
    };

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-background/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center text-xl font-bold">
                    <Music className="mr-3 text-primary" />
                    Lumina Music
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-center h-6">
                    <p className="text-lg font-semibold truncate">
                        {musicPlayer.currentSong ? musicPlayer.currentSong.title : 'No song selected'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Enter song URL (e.g., YouTube, SoundCloud)"
                        value={newSongUrl}
                        onChange={(e) => setNewSongUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSongFromUrl()}
                        className="bg-input/50"
                    />
                    <Button variant="ghost" size="icon" onClick={handleAddSongFromUrl} aria-label="Add Song">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
                <div className="flex justify-center items-center gap-4">
                    <Button onClick={musicPlayer.toggleShuffle} variant={musicPlayer.isShuffled ? "secondary" : "ghost"} size="icon" aria-label="Shuffle">
                        <Shuffle className="h-6 w-6" />
                    </Button>
                    <Button onClick={musicPlayer.playPrev} variant="ghost" size="icon" aria-label="Previous Song">
                        <SkipBack className="h-6 w-6" />
                    </Button>
                    <Button
                        onClick={() => {
                            if (musicPlayer.isPlaying) {
                                playerRef.current?.getInternalPlayer()?.pauseVideo();
                            } else {
                                playerRef.current?.getInternalPlayer()?.playVideo();
                            }
                            musicPlayer.togglePlayPause();
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-16 w-16 hover:bg-primary/20 rounded-full"
                        aria-label={musicPlayer.isPlaying ? "Pause" : "Play"}
                    >
                        {musicPlayer.isPlaying ? <Pause className="h-10 w-10 text-primary" /> : <Play className="h-10 w-10 text-primary" />}
                    </Button>
                    <Button onClick={musicPlayer.playNext} variant="ghost" size="icon" aria-label="Next Song">
                        <SkipForward className="h-6 w-6" />
                    </Button>
                    <Button onClick={musicPlayer.toggleLoop} variant={musicPlayer.isLooping ? "secondary" : "ghost"} size="icon" aria-label="Loop">
                        <Repeat className="h-6 w-6" />
                    </Button>
                </div>
                <Tabs defaultValue="queue" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="queue">Queue</TabsTrigger>
                        <TabsTrigger value="library">Library</TabsTrigger>
                    </TabsList>
                    <TabsContent value="queue">
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                            {musicPlayer.playlist.length > 0 ? (
                                <ul>
                                    {musicPlayer.playlist.map((song, index) => (
                                        <li
                                            key={`${song.url}-${index}`}
                                            className={`p-2 rounded-md cursor-pointer ${index === musicPlayer.currentSongIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                            onClick={() => handleSelectSong(index)}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className="truncate max-w-[calc(100%-32px)]">{song.title}</span>
                                                <button
                                                    className="flex-shrink-0"
                                                    onClick={(e) => handleRemoveSong(e, index)}
                                                    aria-label="Remove Song"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center text-muted-foreground p-4">Your queue is empty.</div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="library">
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                            <ul>
                                {preInstalledSongs.map((song, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted"
                                        onClick={() => handleAddPreinstalledSong(song)}
                                    >
                                        <span>{song.title}</span>
                                        <Button variant="ghost" size="icon" aria-label="Add to Queue">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 w-full">
                        {musicPlayer.volume === 0 ? <VolumeX className="h-6 w-6" /> : musicPlayer.volume > 0.5 ? <Volume2 className="h-6 w-6" /> : <Volume1 className="h-6 w-6" />}
                        <Slider
                            value={[musicPlayer.volume]}
                            onValueChange={handleVolumeChange}
                            max={1}
                            step={0.01}
                            className="w-full"
                            aria-label="Volume"
                        />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleImportPlaylist}
                    />
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Import Playlist">
                        <Upload className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleExportPlaylist} aria-label="Export Playlist">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
                {!musicPlayer.isReady && (
                    <div className="text-center text-xs text-muted-foreground">Player loading...</div>
                )}
            </CardContent>
        </Card>
    );
}
