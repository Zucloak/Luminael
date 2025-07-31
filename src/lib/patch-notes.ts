import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Zap, Rocket, Bug, Gem, Settings2, ImageUp, ListChecks, HardDriveDownload } from 'lucide-react';

export interface PatchNote {
    icon: LucideIcon;
    category: 'Feature' | 'Fix' | 'Improvement' | 'Polish';
    text: string;
}

export interface PatchVersion {
    version: string;
    title: string;
    date: string; // Consider making this a Date object if more complex date logic is needed
    notes: PatchNote[];
}

export const patchNotes: PatchVersion[] = [
    {
        version: '2.5',
        title: '🛠️ Patch v2.5 – August 2025',
        date: 'August 2025',
        notes: [
            {
                icon: Rocket,
                category: 'Feature',
                text: 'Introduced utility tools: Graph Creator, Calculator, Dictionary, Translator, Media Player'
            }
        ]
    },
    {
      version: '1.2.3', // Assuming next version
      title: 'Local Data Management & Continued Refinements',
      date: 'July 2025', // Placeholder, update with actual release month/year
      notes: [
        {
          icon: HardDriveDownload,
          category: 'Feature',
          text: "Introducing Local Data Management! Save your profile and quiz history to your device and load it back anytime. Find this feature on your Profile page."
        },
        // Add other notes for 1.2.3 if any, or this could be a focused release
        // For example, if other minor fixes went in:
        // {
        //   icon: Bug,
        //   category: 'Fix',
        //   text: 'Minor UI adjustments on the quiz interface.'
        // },
      ]
    },
    {
      version: '1.2.2',
      title: 'Eco Mode & Enhanced Interactivity',
      date: 'July 2025', // Placeholder, update with actual release month/year
      notes: [
        {
          icon: Settings2, // Icon for settings/mode
          category: 'Feature',
          text: 'Introducing ECO MODE! Toggle on to minimize AI usage for resource efficiency, featuring local OCR for uploads and manual AI answer validation.'
        },
        {
          icon: Rocket,
          category: 'Improvement',
          text: 'Local OCR (in Eco Mode) now includes image preprocessing (grayscale & binarization) to enhance text extraction quality from your uploads.'
        },
        {
          icon: ShieldCheck,
          category: 'Improvement',
          text: 'Improved LaTeX rendering for more consistent and reliable display of mathematical formulas across the app.'
        },
        {
          icon: Bug,
          category: 'Fix',
          text: 'Addressed issues where some multiple-choice questions had placeholder or misformatted answers, ensuring better question quality.'
        },
        {
          icon: ImageUp, // Icon for file upload
          category: 'Feature',
          text: 'File upload for answers is now available for "Problem Solving" questions, allowing image uploads of detailed solutions.'
        },
        {
          icon: ListChecks, // Icon for preview/list checking
          category: 'Improvement',
          text: 'Live LaTeX preview for answers derived from uploaded images (Open Ended & Problem Solving) is now more dependable.'
        }
      ]
    },
    {
      version: '1.2.1',
      title: 'API Key & Quiz Polish',
      date: 'July 2025', // Placeholder
      notes: [
        {
          icon: ShieldCheck,
          category: 'Fix',
          text: 'Strengthened API key usage for improved privacy and reliable AI operations.'
        },
        {
          icon: Bug,
          category: 'Fix',
          text: 'Resolved a quiz generation issue in Hell Bound mode for uninterrupted challenges.'
        },
        {
          icon: Bug,
          category: 'Fix',
          text: 'Corrected quiz interface navigation for a smoother experience.'
        },
        {
          icon: Gem,
          category: 'Improvement',
          text: 'Improved Live LaTeX Preview for open-ended answers.'
        },
        {
          icon: Rocket,
          category: 'Improvement',
          text: 'Optimized PDF file processing for faster uploads.'
        },
        {
          icon: Zap, // Changed from FileText as it's a new content feature
          category: 'Feature',
          text: 'Added new Privacy Policy and Terms of Service pages.'
        },
        {
          icon: Gem,
          category: 'Polish',
          text: 'Updated footer information.'
        }
      ]
    },
    {
        version: '1.2.0',
        title: 'Stability & Control Boost',
        date: 'June 2025',
        notes: [
            {
                icon: Zap,
                category: 'Improvement',
                text: 'Major architectural improvements for enhanced application stability and resilience.'
            },
            {
                icon: ShieldCheck, // More fitting for control/permissions
                category: 'Feature',
                text: 'Gain more control: remove files, stop processing, and cancel quiz generation.'
            },
            {
                icon: Rocket,
                category: 'Feature',
                text: 'Quiz generation now runs in the background – browse other pages while you wait!'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Ensured consistent and correct rendering for all LaTeX mathematical formulas.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'UI refinements in Hell Bound mode, improved header navigation, and better text display.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Corrected API Key input field to accept standard length keys.'
            },
            {
                icon: Rocket, // Re-using for improvement/guidance
                category: 'Improvement',
                text: 'Updated Profile page with more details on API key usage.'
            }
        ]
    },
    {
        version: '1.1.0',
        title: 'Core Fixes & Enhancements',
        date: 'June 2025',
        notes: [
            {
                icon: Zap, // Good for new feature announcement
                category: 'Feature',
                text: 'Introducing Patch Notes! Stay updated with the latest changes (also on Profile page).'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Resolved a significant crash issue on mobile devices for a stable experience.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Improved AI behavior to prevent duplicate questions in quizzes.'
            },
            {
                icon: Bug,
                category: 'Fix',
                text: 'Enhanced AI’s LaTeX formatting for reliable display of math formulas.'
            },
             {
                icon: Rocket,
                category: 'Improvement',
                text: 'Revamped Profile page to "Pioneer\'s Handbook" with helpful info and feedback options.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Added "Max" button to "Number of Questions" input for convenience.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'Fixed visual misalignments of form elements on the main screen.'
            },
            {
                icon: Gem,
                category: 'Polish',
                text: 'API Key icon in header now subtly indicates if a key is missing.'
            },
            {
                icon: ShieldCheck,
                category: 'Improvement',
                text: 'Fullscreen toggle now smartly hides on unsupported devices (e.g., iPhones).'
            },
        ]
    }
];

// Ensure LATEST_VERSION points to the new version
export const LATEST_VERSION = patchNotes[0].version;
