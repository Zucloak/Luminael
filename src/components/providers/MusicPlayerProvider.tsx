"use client";

import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { musicPlayerManager } from '@/lib/musicPlayerManager';
import { eventBus } from '@/lib/event-bus';

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
    const [playerState, setPlayerState] = useState(musicPlayerManager.getState());

    useEffect(() => {
        const handleStateChange = (state: any) => {
            setPlayerState({ ...state });
        };
        eventBus.on('player-state-change', handleStateChange);
        return () => {
            eventBus.off('player-state-change', handleStateChange);
        };
    }, []);

    const { currentSong, isPlaying, isLooping, volume } = playerState;

    return (
        <>
            {children}
            <div style={{ display: 'none' }}>
                <ReactPlayer
                    url={currentSong?.url}
                    playing={isPlaying}
                    loop={isLooping}
                    volume={volume}
                    onEnded={() => musicPlayerManager.playNext()}
                    width="0"
                    height="0"
                />
            </div>
        </>
    );
}
