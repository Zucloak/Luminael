import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text) return "";
  // Replace \(...\) with $...$
  // Need to be careful with greedy matching if there are nested versions,
  // but for typical AI output this should be okay.
  // The (.*?) makes the star non-greedy.
  // Use a replacer function for clarity and robustness with special characters.
  let result = text.replace(/\\\((.*?)\\\)/g, (match, capturedContent) => `\$${capturedContent}\$`);
  // Replace \[...\] with $$...$$
  result = result.replace(/\\\[(.*?)\\\]/g, (match, capturedContent) => `\$\$${capturedContent}\$\$`);
  return result;
}
