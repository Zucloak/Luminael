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
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
    if (currentTrack?.sourceType === 'direct' && audioRef.current) {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.play().catch(e => console.error("Autoplay was prevented.", e));
        } else {
            audio.pause();
        }
    } else if (currentTrack?.sourceType === 'youtube' && iframeRef.current) {
        const player = iframeRef.current.contentWindow;
        if(player) {
            player.postMessage(JSON.stringify({ event: 'command', func: isPlaying ? 'playVideo' : 'pauseVideo' }), '*');
        }
    }
  }, [isPlaying, currentTrack]);

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
    if (currentTrack?.sourceType === 'direct' && audioRef.current) {
        const audio = audioRef.current;
        if (audio.src !== currentTrack.url) {
            setIsLoading(true);
            audio.src = currentTrack.url;
            audio.load();
            audio.play().catch(e => console.error("Autoplay was prevented.", e)).finally(() => setIsLoading(false));
        }
    }
  }, [currentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isLoading) {
      useMediaPlayer.setState({ currentTime: audioRef.current.currentTime });
    }
  };

  const handleLoadedData = () => {
      useMediaPlayer.setState({ duration: audioRef.current?.duration || 0 });
  }

  if (!currentTrack) return null;

  return (
    <>
      {currentTrack.sourceType === 'direct' && (
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={handleLoadedData}
          onEnded={next}
          className="hidden"
        />
      )}
      {currentTrack.sourceType === 'youtube' && (
        <iframe
          ref={iframeRef}
          src={`${currentTrack.url}?enablejsapi=1&autoplay=1`}
          className="hidden"
          allow="autoplay"
        />
      )}
    </>
  );
}
