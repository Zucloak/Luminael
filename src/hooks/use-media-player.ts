import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  sourceType: 'youtube' | 'direct';
}

interface MediaPlayerState {
  isPlaying: boolean;
  isShuffling: boolean;
  isLooping: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  seekRequest: number | null;
  currentTrackIndex: number | null;
  queue: Track[];
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  seekTo: (time: number) => void;
  onSeeked: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  playTrack: (trackId: string) => void;
  loadQueue: (tracks: Track[]) => void;
}

export const useMediaPlayer = create<MediaPlayerState>((set, get) => ({
  isPlaying: false,
  isShuffling: false,
  isLooping: false,
  volume: 0.5,
  currentTime: 0,
  duration: 0,
  seekRequest: null,
  currentTrackIndex: null,
  queue: [],
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  next: () => {
    const { currentTrackIndex, queue, isShuffling } = get();
    if (currentTrackIndex === null) return;

    if (isShuffling) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      set({ currentTrackIndex: randomIndex });
    } else {
      const nextIndex = (currentTrackIndex + 1) % queue.length;
      set({ currentTrackIndex: nextIndex });
    }
  },
  previous: () => {
    const { currentTrackIndex, queue, isShuffling } = get();
    if (currentTrackIndex === null) return;

    if (isShuffling) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        set({ currentTrackIndex: randomIndex });
    } else {
        const nextIndex = (currentTrackIndex - 1 + queue.length) % queue.length;
        set({ currentTrackIndex: nextIndex });
    }
  },
  toggleShuffle: () => set(state => ({ isShuffling: !state.isShuffling })),
  toggleLoop: () => set(state => ({ isLooping: !state.isLooping })),
  setVolume: (volume: number) => set({ volume }),
  seek: (time: number) => set({ currentTime: time }),
  seekTo: (time: number) => {
    set({ seekRequest: time });
  },
  onSeeked: () => set({ seekRequest: null }),
  addToQueue: (track: Track) => set(state => ({ queue: [...state.queue, track] })),
  removeFromQueue: (trackId: string) => set(state => ({ queue: state.queue.filter(t => t.id !== trackId) })),
  reorderQueue: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newQueue = [...state.queue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      return { queue: newQueue };
    });
  },
  playTrack: (trackId: string) => {
    const { queue } = get();
    const trackIndex = queue.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      set({ currentTrackIndex: trackIndex, isPlaying: true });
    }
  },
  loadQueue: (tracks: Track[]) => set({ queue: tracks }),
}));
