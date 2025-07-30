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
    pause,
    seek
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
    const handleMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return;
        try {
            const data = JSON.parse(event.data);
            if (data.event === 'onStateChange' && data.info?.playerState === 0) { // 0 = ended
                next();
            }
            if (data.event === 'infoDelivery' && data.info?.currentTime) {
                seek(data.info.currentTime);
            }
            if (data.event === 'infoDelivery' && data.info?.duration) {
                useMediaPlayer.setState({ duration: data.info.duration });
            }
        } catch (error) {
            // console.error("Error parsing message from iframe:", error);
        }
    };
    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, [next, seek]);

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
    if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [volume * 100] }), '*');
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  useEffect(() => {
    if (seekRequest !== null) {
        if (currentTrack?.sourceType === 'direct' && audioRef.current) {
            audioRef.current.currentTime = seekRequest;
        } else if (currentTrack?.sourceType === 'youtube' && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekRequest, true] }), '*');
        }
        onSeeked();
    }
  }, [seekRequest, onSeeked, currentTrack]);

  useEffect(() => {
    if (currentTrack?.sourceType === 'direct' && audioRef.current) {
        const audio = audioRef.current;
        if (audio.src !== currentTrack.url) {
            setIsLoading(true);
            audio.src = currentTrack.url;

            const onCanPlay = () => {
                if (isPlaying) {
                    audio.play().catch(e => console.error("Autoplay was prevented.", e));
                }
                setIsLoading(false);
                audio.removeEventListener('canplay', onCanPlay);
            };
            audio.addEventListener('canplay', onCanPlay);
            audio.load();
        }
    }
  }, [currentTrack, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && !isLoading) {
      seek(audioRef.current.currentTime);
    }
  };

  const handleLoadedData = () => {
      useMediaPlayer.setState({ duration: audioRef.current?.duration || 0 });
  }

  // This effect will periodically ask the YouTube player for its current time
  useEffect(() => {
    const interval = setInterval(() => {
        if (currentTrack?.sourceType === 'youtube' && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*');
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'getDuration', args: [] }), '*');
        }
    }, 500);
    return () => clearInterval(interval);
  }, [currentTrack]);

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
          src={`${currentTrack.url}&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
          className="hidden"
          allow="autoplay"
        />
      )}
    </>
  );
}
