declare module 'react-player' {
    import { Component } from 'react';

    export interface ReactPlayerProps {
        url?: string;
        playing?: boolean;
        loop?: boolean;
        controls?: boolean;
        volume?: number;
        muted?: boolean;
        playbackRate?: number;
        width?: string | number;
        height?: string | number;
        style?: React.CSSProperties;
        progressInterval?: number;
        playsinline?: boolean;
        pip?: boolean;
        light?: boolean | string;
        onReady?: () => void;
        onStart?: () => void;
        onPlay?: () => void;
        onPause?: () => void;
        onBuffer?: () => void;
        onBufferEnd?: () => void;
        onEnded?: () => void;
        onError?: (error: any, data?: any, hlsInstance?: any, hlsGlobal?: any) => void;
        onDuration?: (duration: number) => void;
        onSeek?: (seconds: number) => void;
        onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
    }

    export default class ReactPlayer extends Component<ReactPlayerProps> {}
}
