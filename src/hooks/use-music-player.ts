import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '@/lib/event-bus';

export const useMusicPlayer = () => {
    const [playlist, setPlaylist] = useState<{ title: string; url: string; streamUrl?: string }[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem('musicPlayerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            setPlaylist(state.playlist || []);
            setCurrentSongIndex(state.currentSongIndex || -1);
            setIsLooping(state.isLooping || false);
            setIsShuffled(state.isShuffled || false);
            setVolume(state.volume || 0.8);
        }
    }, []);

    useEffect(() => {
        const state = { playlist, currentSongIndex, isPlaying, isLooping, isShuffled, volume };
        localStorage.setItem('musicPlayerState', JSON.stringify(state));
        eventBus.dispatch('player-state-change', state);
    }, [playlist, currentSongIndex, isPlaying, isLooping, isShuffled, volume]);

    const handleUserInteraction = useCallback(() => {
        if (!hasInteracted) {
            setHasInteracted(true);
            setIsReady(true);
        }
    }, [hasInteracted]);

    const togglePlayPause = useCallback(() => {
        handleUserInteraction();
        setIsPlaying(prev => !prev);
    }, [handleUserInteraction]);

    const addSong = useCallback((song: { title: string; url: string }) => {
        const streamUrl = `/api/audio/play?url=${encodeURIComponent(song.url)}`;
        const newSong = { ...song, streamUrl };
        setPlaylist(prev => {
            const newPlaylist = [...prev, newSong];
            if (currentSongIndex === -1) {
                setCurrentSongIndex(newPlaylist.length - 1);
                setIsPlaying(hasInteracted);
            }
            return newPlaylist;
        });
    }, [currentSongIndex, hasInteracted]);

    const removeSong = useCallback((index: number) => {
        setPlaylist(prev => {
            const newPlaylist = [...prev];
            newPlaylist.splice(index, 1);
            if (index === currentSongIndex) {
                if (newPlaylist.length === 0) {
                    setCurrentSongIndex(-1);
                    setIsPlaying(false);
                } else if (currentSongIndex >= newPlaylist.length) {
                    setCurrentSongIndex(0);
                }
            }
            return newPlaylist;
        });
    }, [currentSongIndex]);

    const playNext = useCallback(() => {
        if (playlist.length === 0) return;
        const nextIndex = isShuffled
            ? Math.floor(Math.random() * playlist.length)
            : (currentSongIndex + 1) % playlist.length;
        setCurrentSongIndex(nextIndex);
        setIsPlaying(true);
    }, [currentSongIndex, isShuffled, playlist.length]);

    const playPrev = useCallback(() => {
        if (playlist.length === 0) return;
        const prevIndex = isShuffled
            ? Math.floor(Math.random() * playlist.length)
            : (currentSongIndex - 1 + playlist.length) % playlist.length;
        setCurrentSongIndex(prevIndex);
        setIsPlaying(true);
    }, [currentSongIndex, isShuffled, playlist.length]);

    const toggleLoop = useCallback(() => setIsLooping(prev => !prev), []);
    const toggleShuffle = useCallback(() => setIsShuffled(prev => !prev), []);

    const selectSong = useCallback((index: number) => {
        handleUserInteraction();
        setCurrentSongIndex(index);
        setIsPlaying(true);
    }, [handleUserInteraction]);

    return {
        playlist,
        currentSongIndex,
        isPlaying,
        isLooping,
        isShuffled,
        volume,
        currentSong: playlist[currentSongIndex],
        hasInteracted,
        isReady,
        addSong,
        removeSong,
        playNext,
        playPrev,
        togglePlayPause,
        toggleLoop,
        toggleShuffle,
        setVolume,
        setCurrentSongIndex: selectSong,
        setIsPlaying,
        setIsReady,
    };
};
