"use client";

import React, { useRef } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';

export function DebugPlayer() {
    const playerRef = useRef<ReactPlayer>(null);

    const handlePlay = () => {
        playerRef.current?.getInternalPlayer()?.play();
    };

    return (
        <div>
            <h2>Debug Player</h2>
            <ReactPlayer
                ref={playerRef}
                url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                controls
                onReady={() => console.log('onReady')}
                onStart={() => console.log('onStart')}
                onPlay={() => console.log('onPlay')}
                onPause={() => console.log('onPause')}
                onBuffer={() => console.log('onBuffer')}
                onBufferEnd={() => console.log('onBufferEnd')}
                onError={(e) => console.log('onError', e)}
                onProgress={(p) => console.log('onProgress', p)}
            />
            <Button onClick={handlePlay}>Play</Button>
        </div>
    );
}
