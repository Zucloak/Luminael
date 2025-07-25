"use client";

import React, { createContext, useContext, useRef, RefObject } from 'react';
import ReactPlayer from 'react-player';
import { useMusicPlayer } from '@/hooks/use-music-player';

type MusicPlayerContextType = ReturnType<typeof useMusicPlayer> & {
    playerRef: RefObject<ReactPlayer>;
    isReady: boolean;
};

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const musicPlayer = useMusicPlayer();
    const playerRef = useRef<ReactPlayer>(null);
    const [isReady, setIsReady] = React.useState(false);

    const urlToPlay = musicPlayer.currentSong
        ? `/api/audio?url=${encodeURIComponent(musicPlayer.currentSong.url)}`
        : undefined;

    const handleReady = () => {
        setIsReady(true);
    };

    const handleError = (error: any) => {
        console.error("ReactPlayer Error:", error);

        // Fallback or retry logic can be implemented here
    };

    return (
        <MusicPlayerContext.Provider value={{ ...musicPlayer, playerRef, isReady }}>
            {children}
            <div style={{ display: 'none' }}>
                <ReactPlayer
                    ref={playerRef}
                    url={urlToPlay}
                    playing={musicPlayer.isPlaying && musicPlayer.hasInteracted}
                    loop={musicPlayer.isLooping}
                    volume={musicPlayer.volume}
                    onEnded={musicPlayer.playNext}
                    onReady={handleReady}
                    onError={handleError}
                    playsinline
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
