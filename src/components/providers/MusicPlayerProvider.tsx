"use client";

import React, { createContext, useContext, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useMusicPlayer } from '@/hooks/use-music-player';

const MusicPlayerContext = createContext<ReturnType<typeof useMusicPlayer> | null>(null);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const musicPlayer = useMusicPlayer();
    const playerRef = useRef<ReactPlayer>(null);

    const handleEnded = () => {
        musicPlayer.playNext();
    }

    const urlToPlay = musicPlayer.currentSong ? `/api/audio?url=${encodeURIComponent(musicPlayer.currentSong.url)}` : undefined;

    return (
        <MusicPlayerContext.Provider value={{...musicPlayer, playerRef}}>
            {children}
            <div style={{ display: 'none' }}>
                <ReactPlayer
                    ref={playerRef}
                    url={urlToPlay}
                    playing={musicPlayer.isPlaying}
                    loop={musicPlayer.isLooping}
                    volume={musicPlayer.volume}
                    onEnded={handleEnded}
                    onPlay={() => musicPlayer.setIsPlaying(true)}
                    onPause={() => musicPlayer.setIsPlaying(false)}
                    onError={(e) => console.error("Playback Error:", e)}
                    playsinline
                    width="0"
                    height="0"
                />
            </div>
        </MusicPlayerContext.Provider>
    );
};

export const useMusicPlayerContext = () => {
    const context = useContext(MusicPlayerContext);
    if (!context) {
        throw new Error('useMusicPlayerContext must be used within a MusicPlayerProvider');
    }
    return context;
};
