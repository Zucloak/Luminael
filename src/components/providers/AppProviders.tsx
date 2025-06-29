
"use client";

import { ApiKeyProvider } from "@/hooks/use-api-key";
import { ThemeProvider } from "@/hooks/use-theme";
import { QuizSetupProvider } from "@/hooks/use-quiz-setup";

export function AppProviders({ children }: { children: React.ReactNode }) {
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
