
"use client";

import { useEffect } from "react";
import { ApiKeyProvider } from "@/hooks/use-api-key";
import { ThemeProvider } from "@/hooks/use-theme";
import { QuizSetupProvider } from "@/hooks/use-quiz-setup";
import { useMediaPlayer } from "@/hooks/use-media-player";

export function AppProviders({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const queue = JSON.parse(localStorage.getItem('queue') || '[]');
        const currentTrackIndex = Number(localStorage.getItem('currentTrackIndex')) || null;
        useMediaPlayer.setState({ queue, currentTrackIndex });
    }, []);

    return (
        <ThemeProvider>
            <ApiKeyProvider>
                <QuizSetupProvider>
                    {children}
                </QuizSetupProvider>
            </ApiKeyProvider>
        </ThemeProvider>
    );
}
