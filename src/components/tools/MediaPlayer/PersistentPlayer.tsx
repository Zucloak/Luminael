"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import YouTube from 'react-youtube';
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
    pause,
    seek
  } = useMediaPlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
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
    if (!currentTrack) return;

    if (currentTrack.sourceType === 'direct' && audioRef.current) {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.play().catch(e => console.error("Autoplay was prevented.", e));
        } else {
            audio.pause();
        }
    } else if (currentTrack.sourceType === 'youtube' && youtubePlayerRef.current) {
        if (isPlaying) {
            youtubePlayerRef.current.playVideo();
        } else {
            youtubePlayerRef.current.pauseVideo();
        }
    }
  }, [isPlaying, currentTrack, isReady]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (youtubePlayerRef.current) {
        youtubePlayerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
    if (youtubePlayerRef.current) {
        youtubePlayerRef.current.setLoop(isLooping);
    }
  }, [isLooping]);

  useEffect(() => {
    if (seekRequest !== null) {
        if (currentTrack?.sourceType === 'direct' && audioRef.current) {
            audioRef.current.currentTime = seekRequest;
        } else if (currentTrack?.sourceType === 'youtube' && youtubePlayerRef.current) {
            youtubePlayerRef.current.seekTo(seekRequest, true);
        }
        onSeeked();
    }
  }, [seekRequest, onSeeked, currentTrack]);

  useEffect(() => {
    if (currentTrack?.sourceType === 'direct' && audioRef.current) {
        const audio = audioRef.current;
        if (audio.src !== currentTrack.url) {
            audio.src = currentTrack.url;
            audio.load();
        }
    }
  }, [currentTrack]);

  const onReady = (event: any) => {
    youtubePlayerRef.current = event.target;
    setIsReady(true);
    const duration = event.target.getDuration();
    if (duration) {
        const { queue, currentTrackIndex } = useMediaPlayer.getState();
        if (currentTrackIndex !== null) {
            const newQueue = [...queue];
            newQueue[currentTrackIndex].duration = duration;
            useMediaPlayer.setState({ queue: newQueue });
        }
    }
  };

  const onStateChange = (event: any) => {
    if (event.data === 0) { // 0 = ended
        if (isLooping) {
            youtubePlayerRef.current.playVideo();
        } else {
            next();
        }
    }
    if (event.data === 1) { // 1 = playing
        const duration = youtubePlayerRef.current.getDuration();
        if (duration) {
            const { queue, currentTrackIndex } = useMediaPlayer.getState();
            if (currentTrackIndex !== null) {
                const newQueue = [...queue];
                newQueue[currentTrackIndex].duration = duration;
                useMediaPlayer.setState({ queue: newQueue });
            }
        }
    }
  };

  const handleTimeUpdate = () => {
      if (audioRef.current) {
        seek(audioRef.current.currentTime);
      }
  };

  const handleLoadedData = () => {
      useMediaPlayer.setState({ duration: audioRef.current?.duration || 0 });
  }

  // This effect will periodically ask the YouTube player for its current time
  useEffect(() => {
    const interval = setInterval(() => {
        if (currentTrack?.sourceType === 'youtube' && youtubePlayerRef.current && isReady) {
            const currentTime = youtubePlayerRef.current.getCurrentTime();
            const duration = youtubePlayerRef.current.getDuration();
            if (currentTime) seek(currentTime);
            if (duration) useMediaPlayer.setState({ duration });
        }
    }, 500);
    return () => clearInterval(interval);
  }, [currentTrack, isReady, seek]);

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
        <YouTube
            videoId={currentTrack.id}
            opts={{
                height: '0',
                width: '0',
                playerVars: {
                    autoplay: isPlaying ? 1 : 0,
                },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            className="hidden"
        />
      )}
    </>
  );
}
