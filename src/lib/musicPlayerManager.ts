import { eventBus } from './event-bus';

class MusicPlayerManager {
    private static instance: MusicPlayerManager;
    private playlist: { title: string; url: string }[] = [];
    private currentSongIndex: number = -1;
    private isPlaying: boolean = false;
    private isLooping: boolean = false;
    private isShuffled: boolean = false;
    private volume: number = 0.8;

    private constructor() {
        this.loadState();
    }

    public static getInstance(): MusicPlayerManager {
        if (!MusicPlayerManager.instance) {
            MusicPlayerManager.instance = new MusicPlayerManager();
        }
        return MusicPlayerManager.instance;
    }

    public addSong(song: { title: string; url: string }) {
        this.playlist.push(song);
        if (!this.isPlaying) {
            this.currentSongIndex = this.playlist.length - 1;
            this.isPlaying = true;
        }
        this.saveState();
        eventBus.dispatch('playlist-change', this.playlist);
        eventBus.dispatch('player-state-change', this.getState());
    }

    public removeSong(index: number) {
        this.playlist.splice(index, 1);
        if (index === this.currentSongIndex) {
            if (this.playlist.length === 0) {
                this.currentSongIndex = -1;
                this.isPlaying = false;
            } else if (this.currentSongIndex >= this.playlist.length) {
                this.currentSongIndex = 0;
            }
        }
        this.saveState();
        eventBus.dispatch('playlist-change', this.playlist);
        eventBus.dispatch('player-state-change', this.getState());
    }

    public playNext() {
        if (this.isShuffled) {
            this.currentSongIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentSongIndex = (this.currentSongIndex + 1) % this.playlist.length;
        }
        this.isPlaying = true;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public playPrev() {
        this.currentSongIndex = (this.currentSongIndex - 1 + this.playlist.length) % this.playlist.length;
        this.isPlaying = true;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public toggleLoop() {
        this.isLooping = !this.isLooping;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public setVolume(volume: number) {
        this.volume = volume;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public setCurrentSongIndex(index: number) {
        this.currentSongIndex = index;
        this.isPlaying = true;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public getState() {
        return {
            playlist: this.playlist,
            currentSongIndex: this.currentSongIndex,
            isPlaying: this.isPlaying,
            isLooping: this.isLooping,
            isShuffled: this.isShuffled,
            volume: this.volume,
            currentSong: this.playlist[this.currentSongIndex],
        };
    }

    private saveState() {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const serializedState = JSON.stringify(this.getState());
            localStorage.setItem('musicPlayerState', serializedState);
        } catch (error) {
            console.error('Error saving music player state:', error);
        }
    }

    private loadState() {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const serializedState = localStorage.getItem('musicPlayerState');
            if (serializedState) {
                const state = JSON.parse(serializedState);
                this.playlist = state.playlist || [];
                this.currentSongIndex = state.currentSongIndex || -1;
                this.isPlaying = state.isPlaying || false;
                this.isLooping = state.isLooping || false;
                this.isShuffled = state.isShuffled || false;
                this.volume = state.volume || 0.8;
            }
        } catch (error) {
            console.error('Error loading music player state:', error);
        }
    }
}

export const musicPlayerManager = MusicPlayerManager.getInstance();
