"use client";

import React, { useState, useEffect } from 'react';
import { musicPlayerManager } from '@/lib/musicPlayerManager';
import { eventBus } from '@/lib/event-bus';

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
    const [playerState, setPlayerState] = useState(musicPlayerManager.getState());

    useEffect(() => {
        const handleStateChange = (state: any) => {
            setPlayerState(state);
        };
        eventBus.on('player-state-change', handleStateChange);
        return () => {
            eventBus.off('player-state-change', handleStateChange);
        };
    }, []);

    return <>{children}</>;
}
