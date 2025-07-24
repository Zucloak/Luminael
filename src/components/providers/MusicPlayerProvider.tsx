"use client";

import React, { createContext, useContext, useState } from 'react';
import ReactPlayer from 'react-player';
import { useMusicPlayer } from '@/hooks/use-music-player';

const MusicPlayerContext = createContext<ReturnType<typeof useMusicPlayer> | null>(null);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const musicPlayer = useMusicPlayer();
    const [error, setError] = useState<string | null>(null);

    const handleError = (e: any) => {
        console.error("Playback Error:", e);
        setError("Error during playback. Please check the console for details.");
    };

    const urlToPlay = musicPlayer.currentSong ? `/api/audio?url=${encodeURIComponent(musicPlayer.currentSong.url)}` : undefined;

    return (
        <MusicPlayerContext.Provider value={musicPlayer}>
            {children}
            {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
            <div style={{ display: 'none' }}>
                <ReactPlayer
                    url={urlToPlay}
                    playing={musicPlayer.isPlaying}
                    loop={musicPlayer.isLooping}
                    volume={musicPlayer.volume}
                    onEnded={musicPlayer.playNext}
                    onError={handleError}
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
