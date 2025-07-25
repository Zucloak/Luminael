import { useState, useEffect } from 'react';
import { eventBus } from '@/lib/event-bus';

import { useAudioPlayer } from './use-audio-player';

export const useMusicPlayer = () => {
    const audioPlayer = useAudioPlayer();
    const [playlist, setPlaylist] = useState<{ title: string; url: string }[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [volume, setVolume] = useState(0.8);

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
        const state = {
            playlist,
            currentSongIndex,
            isLooping,
            isShuffled,
            volume,
        };
        localStorage.setItem('musicPlayerState', JSON.stringify(state));
        eventBus.dispatch('player-state-change', state);
    }, [playlist, currentSongIndex, isLooping, isShuffled, volume]);

    const addSong = (song: { title: string; url: string }) => {
        const newPlaylist = [...playlist, song];
        setPlaylist(newPlaylist);
        if (!audioPlayer.isPlaying) {
            setCurrentSongIndex(newPlaylist.length - 1);
            audioPlayer.play();
        }
    };

    const removeSong = (index: number) => {
        const newPlaylist = [...playlist];
        newPlaylist.splice(index, 1);
        setPlaylist(newPlaylist);
        if (index === currentSongIndex) {
            if (newPlaylist.length === 0) {
                setCurrentSongIndex(-1);
                audioPlayer.pause();
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
        audioPlayer.play();
    };

    const playPrev = () => {
        setCurrentSongIndex((currentSongIndex - 1 + playlist.length) % playlist.length);
        audioPlayer.play();
    };

    const togglePlayPause = () => {
        audioPlayer.togglePlayPause();
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
        audioPlayer.play();
    };

    return {
        playlist,
        currentSongIndex,
        isLooping,
        isShuffled,
        volume,
        currentSong: playlist[currentSongIndex],
        addSong,
        removeSong,
        playNext,
        playPrev,
        togglePlayPause,
        toggleLoop,
        toggleShuffle,
        setVolume: setVolumeState,
        setCurrentSongIndex: setCurrentSongIndexState,
        audioPlayer,
    };
};
