"use client";

import { ApiKeyProvider } from "@/hooks/use-api-key";
import { ThemeProvider } from "@/hooks/use-theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <ApiKeyProvider>
                {children}
            </ApiKeyProvider>
        </ThemeProvider>
    );
}
