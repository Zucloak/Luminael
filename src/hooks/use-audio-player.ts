import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';

export const useAudioPlayer = () => {
    const playerRef = useRef<ReactPlayer>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const play = () => {
        if (playerRef.current) {
            // @ts-ignore
            const promise = playerRef.current.getInternalPlayer().play();
            if (promise !== undefined) {
                promise.then(() => {
                    setIsPlaying(true);
                }).catch((error: any) => {
                    console.error('Error playing audio:', error);
                    setIsPlaying(false);
                });
            }
        }
    };

    const pause = () => {
        if (playerRef.current) {
            // @ts-ignore
            playerRef.current.getInternalPlayer().pause();
            setIsPlaying(false);
        }
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    return {
        playerRef,
        isPlaying,
        togglePlayPause,
    };
};
