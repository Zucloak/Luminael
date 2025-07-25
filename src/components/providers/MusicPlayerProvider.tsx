"use client";

import React, { createContext, useContext } from 'react';
import ReactPlayer from 'react-player';
import { useMusicPlayer } from '@/hooks/use-music-player';

const MusicPlayerContext = createContext<ReturnType<typeof useMusicPlayer> | null>(null);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const musicPlayer = useMusicPlayer();
    return (
        <MusicPlayerContext.Provider value={musicPlayer}>
            {children}
            <div style={{ display: 'none' }}>
                <ReactPlayer
                    ref={musicPlayer.audioPlayer.playerRef}
                    url={musicPlayer.currentSong?.url}
                    playing={musicPlayer.audioPlayer.isPlaying}
                    loop={musicPlayer.isLooping}
                    volume={musicPlayer.volume}
                    onEnded={musicPlayer.playNext}
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
