import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { eventBus } from '@/lib/event-bus';

export const useMusicPlayer = () => {
    const playerRef = useRef<ReactPlayer>(null);
    const [playlist, setPlaylist] = useState<{ title: string; url: string }[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [volume, setVolume] = useState(0.8);

    useEffect(() => {
        const savedState = localStorage.getItem('musicPlayerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            setPlaylist(state.playlist || []);
            setCurrentSongIndex(state.currentSongIndex || -1);
            setIsPlaying(state.isPlaying || false);
            setIsLooping(state.isLooping || false);
            setIsShuffled(state.isShuffled || false);
            setVolume(state.volume || 0.8);
        }
    }, []);

    useEffect(() => {
        const state = {
            playlist,
            currentSongIndex,
            isPlaying,
            isLooping,
            isShuffled,
            volume,
        };
        localStorage.setItem('musicPlayerState', JSON.stringify(state));
        eventBus.dispatch('player-state-change', state);
    }, [playlist, currentSongIndex, isPlaying, isLooping, isShuffled, volume]);

    const addSong = (song: { title: string; url: string }) => {
        const newPlaylist = [...playlist, song];
        setPlaylist(newPlaylist);
        if (!isPlaying) {
            setCurrentSongIndex(newPlaylist.length - 1);
            // @ts-ignore
            playerRef.current?.getInternalPlayer()?.play().catch((error) => {
                console.error('Error playing audio:', error);
            });
        }
    };

    const removeSong = (index: number) => {
        const newPlaylist = [...playlist];
        newPlaylist.splice(index, 1);
        setPlaylist(newPlaylist);
        if (index === currentSongIndex) {
            if (newPlaylist.length === 0) {
                setCurrentSongIndex(-1);
                setIsPlaying(false);
            } else if (currentSongIndex >= newPlaylist.length) {
                setCurrentSongIndex(0);
            }
        }
    };

    const playNext = () => {
        if (isShuffled) {
            setCurrentSongIndex(Math.floor(Math.random() * playlist.length));
        } else {
            setCurrentSongIndex((currentSongIndex + 1) % playlist.length);
        }
        setIsPlaying(true);
    };

    const playPrev = () => {
        setCurrentSongIndex((currentSongIndex - 1 + playlist.length) % playlist.length);
        setIsPlaying(true);
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
    };

    const toggleShuffle = () => {
        setIsShuffled(!isShuffled);
    };

    const setVolumeState = (newVolume: number) => {
        setVolume(newVolume);
    };

    const setCurrentSongIndexState = (index: number) => {
        setCurrentSongIndex(index);
        setIsPlaying(true);
    };

    return {
        playlist,
        currentSongIndex,
        isPlaying,
        isLooping,
        isShuffled,
        volume,
        currentSong: playlist[currentSongIndex],
        playerRef,
        addSong,
        removeSong,
        playNext,
        playPrev,
        togglePlayPause,
        toggleLoop,
        toggleShuffle,
        setVolume: setVolumeState,
        setCurrentSongIndex: setCurrentSongIndexState,
        setIsPlaying,
    };
};
