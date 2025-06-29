import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Zap, Rocket, Bug, Gem } from 'lucide-react';

export interface PatchNote {
    icon: LucideIcon;
    category: 'Feature' | 'Fix' | 'Improvement' | 'Polish';
    text: string;
}

export interface PatchVersion {
    version: string;
    title: string;
    date: string;
    notes: PatchNote[];
}

export const patchNotes: PatchVersion[] = [
    {
        version: '1.1.0',
        title: 'The Phoenix Update',
        date: 'July 2024',
        notes: [
            {
                icon: Zap,
                category: 'Feature',
                text: 'Patch Notes are here! A changelog will now appear after updates, and is permanently available on the Profile page.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Annihilated a persistent and infuriating crash on mobile devices (the infamous "Hydration Error"). The app is now rock-solid.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Corrected a major AI flaw causing duplicate questions to appear in quizzes.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Taught the AI to properly format all mathematical formulas (LaTeX), ensuring they now render correctly every time.'
            },
             {
                icon: Rocket,
                category: 'Improvement',
                text: 'The Profile page has been transformed into a "Pioneer\'s Handbook", providing valuable info on the app\'s unique features and a direct way to submit feedback.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'The "Number of Questions" input field now includes a handy "Max" button for quicker setup.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Fixed a frustrating visual bug where form elements on the main screen were misaligned.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Added a subtle indicator to the API Key icon in the header, which now only appears if the key is missing.'
            },
            {
                icon: ShieldCheck,
                category: 'Improvement',
                text: 'The Fullscreen toggle is now smarter, automatically hiding itself on devices (like iPhones) that do not support the feature, preventing confusion.'
            },
        ]
    }
];

export const LATEST_VERSION = patchNotes[0].version;
