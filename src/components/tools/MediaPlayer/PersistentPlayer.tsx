"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useMediaPlayer } from '@/hooks/use-media-player';

export function PersistentPlayer() {
  const {
    isPlaying,
    isLooping,
    volume,
    seekRequest,
    onSeeked,
    currentTrackIndex,
    queue,
    next,
    previous,
    play,
    pause
  } = useMediaPlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (currentTrack) isPlaying ? pause() : play();
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (currentTrack) next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentTrack) previous();
        break;
    }
  }, [isPlaying, play, pause, next, previous, currentTrack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch (error) {
        console.error("Autoplay was prevented.", error);
        pause(); // If autoplay fails, set state to paused
      }
    };

    if (isPlaying && audio.src) {
        playAudio();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current && seekRequest !== null) {
      audioRef.current.currentTime = seekRequest;
      onSeeked();
    }
  }, [seekRequest, onSeeked]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const loadTrack = async () => {
      if (!currentTrack) {
        audio.src = "";
        return;
      }
      if (audio.src === currentTrack.url) return;

      setIsLoading(true);
      audio.src = currentTrack.url;
      try {
        await audio.load(); // Explicitly load
        if (isPlaying) {
            await audio.play();
        }
      } catch (error) {
          console.error("Error loading track:", error);
          pause();
      } finally {
        setIsLoading(false);
      }
    };

    loadTrack();
  }, [currentTrack?.id]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isLoading) {
      useMediaPlayer.setState({ currentTime: audioRef.current.currentTime });
    }
  };

  const handleLoadedData = () => {
      useMediaPlayer.setState({ duration: audioRef.current?.duration || 0 });
  }

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedData={handleLoadedData}
      onEnded={next}
    />
  );
}
