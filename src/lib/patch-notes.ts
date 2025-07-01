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
      version: '1.2.1',
      title: 'Stability & Accuracy Enhancements',
      date: 'July 2024', // TODO: Update with actual release month/year
      notes: [
        {
          icon: ShieldCheck,
          category: 'Fix',
          text: 'Resolved critical Vercel deployment errors by ensuring user-provided API keys are correctly and consistently used for all AI operations, enhancing privacy and reliability.'
        },
        {
          icon: Bug,
          category: 'Fix',
          text: 'Corrected an issue in Hell Bound quiz mode that prevented quiz generation due to a missing model configuration on the server.'
        },
        {
          icon: Bug,
          category: 'Fix',
          text: 'Fixed a navigation bug in the quiz interface where the "Back" button was incorrectly advancing to the next question.'
        },
        {
          icon: Gem,
          category: 'Improvement',
          text: 'Improved Live LaTeX Preview in the quiz interface for open-ended answers to render mathematical notation more reliably.'
        },
        {
          icon: Rocket,
          category: 'Improvement',
          text: 'Optimized PDF file processing by adjusting how AI OCR is handled for multi-page documents, reducing upload delays.'
        },
        {
          icon: Zap,
          category: 'Feature',
          text: 'Added new Privacy Policy and Terms of Service pages with detailed information about Luminael\'s commitment to user privacy and client-side processing.'
        },
        {
          icon: Gem,
          category: 'Polish',
          text: 'Updated footer information with developer details and copyright notice.'
        }
      ]
    },
    {
        version: '1.2.0',
        title: 'The Bedrock Update',
        date: 'June 2024',
        notes: [
            {
                icon: Zap,
                category: 'Improvement',
                text: 'A massive architectural overhaul has eliminated an entire class of server-crashing bugs. The application is now fundamentally more stable and resilient.'
            },
            {
                icon: ShieldCheck,
                category: 'Feature',
                text: 'You now have full control. Added the ability to remove individual files, stop file processing, and cancel quiz generation at any time.'
            },
            {
                icon: Rocket,
                category: 'Feature',
                text: 'Quiz generation now runs seamlessly in the background. Feel free to browse the Profile page while your quiz is being created.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Permanently fixed all LaTeX math rendering issues by enforcing a strict, non-negotiable format for the AI. Mathematical notation will now render correctly, every time.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Improved UI visibility in Hell Bound mode, fixed text overflowing its container, and optimized header navigation for a snappier feel.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'The API Key input field now correctly enforces the standard 39-character limit to prevent errors.'
            },
            {
                icon: Rocket,
                category: 'Improvement',
                text: 'The Profile page has been updated with a new "Key to Your Engine" section, explaining the role of the Gemini API key.'
            }
        ]
    },
    {
        version: '1.1.0',
        title: 'The Phoenix Update',
        date: 'June 2024',
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

export const LATEST_VERSION = patchNotes[0].version; // This will now be 1.2.1
