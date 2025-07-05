import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  let newResult = text;

  // Step 0: Clean common AI artifacts
  newResult = newResult.replace(/ \$=/g, ' ='); // Clean " $=" to " ="
  newResult = newResult.replace(/\$=/g, '=');   // Clean "$=" to "="

  // Step 1: Convert standard LaTeX command delimiters \(...\) and \[...\] to $...$ and $$...$$
  newResult = newResult.replace(/\\\((.*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[(.*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 2: Normalize explicit escaped dollar signs from AI (e.g., \\$ -> $)
  newResult = newResult.replace(/\\?\$/g, '$'); // Match literal \$ and also unescaped $ for safety before next steps

  // Step 3: Handle \boxed{...} specifically. It should always be display style ($$).
  // Remove any existing $ or $$ immediately around a \boxed{} expression, and also leading/trailing newlines or spaces.
  newResult = newResult.replace(/\s*\$\$?\s*(\\boxed\{[^}]*?\})\s*\$\$?\s*/g, '$1');
  // Then, (re-)wrap all \boxed{...} expressions with $$...$$ to ensure display style.
  newResult = newResult.replace(/(\\boxed\{[^}]*?\})(?!\s*\$)/g, '$$$$$1$$'); // Avoid double wrapping if already correctly wrapped by subsequent logic

  // Step 4: Attempt to fix hanging $$ delimiters or wrap content that looks like it starts with $$
  // If a string starts with $$ but doesn't end with $$, wrap the whole thing or the segment.
  // This is heuristic.
  newResult = newResult.replace(/^(\$\$[^\$]+)$/gm, (match, content) => {
    if (content.endsWith('\n')) return `${content.trim()}$$`; // if it ends with newline, trim and add $$
    return `${content}$$`; // otherwise just add $$
  });
   // And if it ends with $$ but doesn't start with it
  newResult = newResult.replace(/^([^\$]+\$\$)$/gm, (match, content) => `$$${content}`);


  // Step 5: Aggressively wrap potential inline math (heuristic)
  // This targets common LaTeX structures not already delimited.
  // Matches sequences like "word = \cmd^{...}_{...} \text{...}"
  // Or "q_1 = 2 \times 10^{-9}"
  // This is complex and might need refinement.
  // Avoid wrapping if already inside $...$ or $$...$$
  // This regex is a placeholder for a more sophisticated approach if needed,
  // as true robust parsing is very hard with regex alone.
  // For now, let's focus on ensuring what IS delimited is clean.
  // The prompt to the AI to use $ and $$ for *all* math is the primary defense.
  // The issues seem to be more about *malformed* delimiters from the AI.

  // Step 6: Clean up repeated/redundant dollar signs.
  // Reduce sequences of 3 or more dollar signs to 2 (e.g., $$$ -> $$).
  newResult = newResult.replace(/\${3,}/g, '$$');
  // Correct $ $$...$$ $ to $$...$$
  newResult = newResult.replace(/^\$\s*\$\$(.*?)\$\$\s*\$$/gs, '$$$$$1$$');
   // Correct $$ $...$ $$ to $...$ if $...$ is the only content
  newResult = newResult.replace(/^\$\$\s*\$([^\$]+)\$\s*\$\$$/gs, '$$$1$');


  // Step 7: Remove spaces immediately inside delimiters, e.g., $ content $ -> $content$
  newResult = newResult.replace(/\$\s+([^$]*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+([^$]*?)\s+\$\$/gs, '$$$$$1$$');

  // Step 8: Final check for any single $ that might be left hanging at start/end of lines from previous ops.
  newResult = newResult.replace(/^\s*\$\s*$/gm, ''); // Remove lines that are just a single $

  return newResult.trim(); // Trim the final result
}
