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
  // $$ in replacement string means a literal $
  let result = text.replace(/\\\((.*?)\\\)/g, '$$$$1$$'); // Replaces \(content\) with $content$
  // Replace \[...\] with $$...$$
  result = result.replace(/\\\[(.*?)\\\]/g, '$$$$$$1$$$$'); // Replaces \[content\] with $$content$$
  return result;
}
