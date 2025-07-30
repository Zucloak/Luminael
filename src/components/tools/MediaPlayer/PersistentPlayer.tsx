"use client";

import React, { useRef, useEffect, useCallback } from 'react';
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
  const currentTrack = currentTrackIndex !== null ? queue[currentTrackIndex] : null;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger hotkeys if the user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        isPlaying ? pause() : play();
        break;
      case 'ArrowRight':
        event.preventDefault();
        next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        previous();
        break;
    }
  }, [isPlaying, play, pause, next, previous]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Effect to control play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && currentTrack) {
        if (audioRef.current.src !== currentTrack.url) {
            audioRef.current.src = currentTrack.url;
        }
        audioRef.current.play().catch(e => console.error("Autoplay was prevented.", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Effect to update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Effect to update loop status
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Effect to handle seek requests
  useEffect(() => {
    if (audioRef.current && seekRequest !== null) {
      audioRef.current.currentTime = seekRequest;
      onSeeked();
    }
  }, [seekRequest, onSeeked]);

  // Effect to update the audio src when the track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Autoplay was prevented on track change.", e));
      }
    } else if (audioRef.current && !currentTrack) {
        audioRef.current.src = "";
    }
  }, [currentTrack?.id]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      useMediaPlayer.setState({ currentTime: audioRef.current.currentTime });
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      useMediaPlayer.setState({ duration: audioRef.current.duration });
    }
  };

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={next}
    />
  );
}
