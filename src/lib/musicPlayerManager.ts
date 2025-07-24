import { Howl } from 'howler';
import { eventBus } from './event-bus';

class MusicPlayerManager {
    private static instance: MusicPlayerManager;
    private playlist: { title: string; url: string }[] = [];
    private currentSongIndex: number = -1;
    private isPlaying: boolean = false;
    private isLooping: boolean = false;
    private isShuffled: boolean = false;
    private volume: number = 0.8;
    private sound: Howl | null = null;

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
            this.play();
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
                this.sound?.stop();
            } else if (this.currentSongIndex >= this.playlist.length) {
                this.currentSongIndex = 0;
                this.play();
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
        this.play();
    }

    public playPrev() {
        this.currentSongIndex = (this.currentSongIndex - 1 + this.playlist.length) % this.playlist.length;
        this.play();
    }

    public togglePlayPause() {
        if (this.isPlaying) {
            this.sound?.pause();
        } else {
            this.sound?.play();
        }
        this.isPlaying = !this.isPlaying;
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public toggleLoop() {
        this.isLooping = !this.isLooping;
        this.sound?.loop(this.isLooping);
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
        this.sound?.volume(volume);
        this.saveState();
        eventBus.dispatch('player-state-change', this.getState());
    }

    public setCurrentSongIndex(index: number) {
        this.currentSongIndex = index;
        this.play();
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

    private play() {
        if (this.sound) {
            this.sound.unload();
        }
        const song = this.playlist[this.currentSongIndex];
        if (song) {
            this.sound = new Howl({
                src: [song.url],
                html5: true,
                volume: this.volume,
                loop: this.isLooping,
                onend: () => {
                    if (!this.isLooping) {
                        this.playNext();
                    }
                },
            });
            this.sound.play();
            this.isPlaying = true;
            this.saveState();
            eventBus.dispatch('player-state-change', this.getState());
        }
    }

    private saveState() {
        try {
            const serializedState = JSON.stringify(this.getState());
            localStorage.setItem('musicPlayerState', serializedState);
        } catch (error) {
            console.error('Error saving music player state:', error);
        }
    }

    private loadState() {
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
