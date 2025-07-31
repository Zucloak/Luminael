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

const isValidTrack = (track: any): track is Track => {
  return (
    track &&
    typeof track.id === 'string' &&
    typeof track.title === 'string' &&
    typeof track.artist === 'string' &&
    typeof track.url === 'string' &&
    typeof track.duration === 'number' &&
    ['youtube', 'direct'].includes(track.sourceType)
  );
};

const getInitialQueue = (): Track[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const item = localStorage.getItem('queue');
    if (!item) return [];
    const parsed = JSON.parse(item);
    if (Array.isArray(parsed) && parsed.every(isValidTrack)) {
      return parsed;
    }
    localStorage.removeItem('queue');
    return [];
  } catch (error) {
    console.error("Failed to parse queue from localStorage", error);
    localStorage.removeItem('queue');
    return [];
  }
};

export const useMediaPlayer = create<MediaPlayerState>((set, get) => ({
  isPlaying: false,
  isShuffling: typeof window !== 'undefined' ? localStorage.getItem('isShuffling') === 'true' : false,
  isLooping: typeof window !== 'undefined' ? localStorage.getItem('isLooping') === 'true' : false,
  volume: 0.5,
  currentTime: 0,
  duration: 0,
  seekRequest: null,
  currentTrackIndex: null,
  queue: getInitialQueue(),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  next: () => {
    const { currentTrackIndex, queue, isShuffling } = get();
    if (currentTrackIndex === null) return;

    if (isShuffling) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (queue.length > 1 && nextIndex === currentTrackIndex);
      set({ currentTrackIndex: nextIndex });
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
  toggleShuffle: () => set(state => {
    localStorage.setItem('isShuffling', String(!state.isShuffling));
    return { isShuffling: !state.isShuffling };
  }),
  toggleLoop: () => set(state => {
    localStorage.setItem('isLooping', String(!state.isLooping));
    return { isLooping: !state.isLooping };
  }),
  setVolume: (volume: number) => set({ volume }),
  seek: (time: number) => set({ currentTime: time }),
  seekTo: (time: number) => {
    set({ seekRequest: time });
  },
  onSeeked: () => set({ seekRequest: null }),
  addToQueue: (track: Track) => set(state => {
    const newQueue = [...state.queue, track];
    localStorage.setItem('queue', JSON.stringify(newQueue));
    return { queue: newQueue };
  }),
  removeFromQueue: (trackId: string) => set(state => {
    const newQueue = state.queue.filter(t => t.id !== trackId);
    localStorage.setItem('queue', JSON.stringify(newQueue));
    return { queue: newQueue };
  }),
  reorderQueue: (fromIndex: number, toIndex: number) => {
    set(state => {
      const newQueue = [...state.queue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      localStorage.setItem('queue', JSON.stringify(newQueue));
      return { queue: newQueue };
    });
  },
  playTrack: (trackId: string) => {
    const { queue } = get();
    const trackIndex = queue.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      console.log("Setting currentTrackIndex to", trackIndex);
      localStorage.setItem('currentTrackIndex', String(trackIndex));
      set({ currentTrackIndex: trackIndex, isPlaying: true });
    }
  },
  loadQueue: (tracks: Track[]) => {
      localStorage.setItem('queue', JSON.stringify(tracks));
      set({ queue: tracks });
  },
}));
