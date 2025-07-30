
"use client";

import { ApiKeyProvider } from "@/hooks/use-api-key";
import { ThemeProvider } from "@/hooks/use-theme";
import { QuizSetupProvider } from "@/hooks/use-quiz-setup";
import { PersistentPlayer } from "@/components/tools/MediaPlayer/PersistentPlayer";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <ApiKeyProvider>
                <QuizSetupProvider>
                    {children}
                    <PersistentPlayer />
                </QuizSetupProvider>
            </ApiKeyProvider>
        </ThemeProvider>
    );
}
