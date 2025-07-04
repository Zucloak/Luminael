import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  let newResult = text;

  // Step 1: Convert standard LaTeX command delimiters \(...\) and \[...\] to $...$ and $$...$$
  // These are unlikely if AI follows prompt, but good for robustness.
  // Ensure non-greedy match for content within delimiters (.*?)
  newResult = newResult.replace(/\\\((.*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[(.*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 2: Normalize explicit escaped dollar signs from AI (e.g., \\$ -> $)
  // This simplifies patterns if AI tries to escape its own delimiters.
  // Must come after step 1, in case AI outputs something like \\$\\\[ ... \\]\\$
  newResult = newResult.replace(/\\\\\$/g, '$');

  // Step 3: Handle \boxed{...}. It should always be display style ($$).
  // To do this safely, first remove any existing $ or $$ immediately around a \boxed{} expression.
  // This regex matches \boxed{...} that might be optionally wrapped by $ or $$.
  // It captures the \boxed{...} part itself into $1.
  newResult = newResult.replace(/\$\$?\s*(\\boxed\{[^}]*?\})\s*\$\$?/g, '$1');
  // Then, (re-)wrap all \boxed{...} expressions with $$...$$ to ensure display style.
  newResult = newResult.replace(/(\\boxed\{[^}]*?\})/g, '$$$$$1$$');

  // Step 4: Clean up repeated/redundant dollar signs.
  // Reduce sequences of 3 or more dollar signs to 2 (e.g., $$$ -> $$).
  newResult = newResult.replace(/\${3,}/g, '$$');

  // Correct patterns like $ $$...$$ $ to $$...$$
  newResult = newResult.replace(/\$\s*\$\$(.*?)\$\$\s*\$/gs, '$$$$$1$$');
  // Correct patterns like $$ $...$ $$ to $$...$$
  // This one is a bit more complex: if $...$ is valid inline math inside display math, it's okay.
  // However, if it's an artifact of incorrect processing, it should be cleaned.
  // E.g. if AI produced $$ $variable$ = value $$, it should be $$ variable = value $$.
  // A simple replace might be too aggressive. For now, let's assume the AI prompt
  // (which asks for $ or $$ for *every* math piece) and the \${3,} cleanup handle most cases.
  // A common error is `$$ text $math$ text $$` which is valid.
  // An error like `$$ $math$ $$` (where $math$ is the *only* content) should be `$$math$$` or `$math$`.
  // The current logic doesn't simplify `$$ $x$ $$` to `$$x$$` if x was meant to be part of display.
  // This is a minor issue compared to the main delimiter corruption.

  // Remove spaces immediately inside delimiters, e.g., $ content $ -> $content$
  newResult = newResult.replace(/\$\s+(.*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+(.*?)\s+\$\$/gs, '$$$$$1$$');

  return newResult;
}
