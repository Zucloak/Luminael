"use client";

import React, { createContext, useContext, useRef, RefObject } from 'react';
import dynamic from 'next/dynamic';
import { useMusicPlayer } from '@/hooks/use-music-player';
import { toast } from '@/hooks/use-toast';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

type MusicPlayerContextType = ReturnType<typeof useMusicPlayer> & {
    playerRef: RefObject<ReactPlayer>;
    isReady: boolean;
};

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const musicPlayer = useMusicPlayer();
    const playerRef = useRef<ReactPlayer>(null);
    const [isReady, setIsReady] = React.useState(false);

    const urlToPlay = musicPlayer.currentSong?.url;

    const handleReady = () => {
        setIsReady(true);
    };

    const handlePlay = () => {
        musicPlayer.setIsPlaying(true);
    };

    const handlePause = () => {
        musicPlayer.setIsPlaying(false);
    };

    const handleError = (error: any) => {
        console.error("ReactPlayer Error:", error);
        toast({
            title: "Playback Error",
            description: "An error occurred while trying to play the audio. Please try another song.",
            variant: "destructive",
        });
        musicPlayer.setIsPlaying(false);
    };

    return (
        <MusicPlayerContext.Provider value={{ ...musicPlayer, playerRef, isReady }}>
            {children}
            <div style={{ display: 'none' }}>
                {urlToPlay && (
                    <ReactPlayer
                        key={urlToPlay}
                        ref={playerRef}
                        url={urlToPlay}
                        playing={musicPlayer.isPlaying && musicPlayer.hasInteracted}
                        loop={musicPlayer.isLooping}
                        volume={musicPlayer.volume}
                        onReady={handleReady}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onEnded={musicPlayer.playNext}
                        onError={handleError}
                        playsinline
                    />
                )}
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
