import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  let newResult = text;

  // Placeholders for correctly delimited $$ \boxed{...} $$ blocks
  const boxedPlaceholders: string[] = [];
  const boxedPlaceholderPrefix = "__LATEX_BOXED_PLACEHOLDER_";

  // Step ALPHA: Absolutely protect correctly formed $$ \boxed{...} $$
  newResult = newResult.replace(/(\$\$\s*\\boxed\{[\s\S]*?\}\s*\$\$)/g, (match) => {
    boxedPlaceholders.push(match);
    return `${boxedPlaceholderPrefix}${boxedPlaceholders.length - 1}__`;
  });

  // Step BETA: Remove zero-width spaces (everywhere except within placeholders)
  const partsForBeta = newResult.split(boxedPlaceholderPrefix);
  newResult = partsForBeta.map((part, index) => {
    if (index === 0) return part.replace(/\u200B/g, '');
    const [num, ...rest] = part.split("__");
    return `${num}__${rest.join("__").replace(/\u200B/g, '')}`;
  }).join(boxedPlaceholderPrefix);

  // Step GAMMA: Normalize newlines that seem to fragment inline math (heuristic)
  // Example: C \n1\n = to C_1 =
  // This is very specific to patterns like "C <newline> <number> <newline> ="
  newResult = newResult.replace(/([a-zA-Z])\s*\n\s*(\d+)\s*\n\s*=\s*/g, '$1_$2 = ');
  // Clean up general excessive newlines into spaces, but try to preserve double newlines (paragraph breaks)
  newResult = newResult.replace(/([^\n])\n([^\n])/g, '$1 $2'); // Single newline to space
  newResult = newResult.replace(/\n{2,}/g, '\n\n'); // Keep paragraph breaks

  // Step 0: Clean common AI artifacts (like $=)
  newResult = newResult.replace(/ \$=/g, ' =');
  newResult = newResult.replace(/\$=/g, '=');

  // Step 1: Convert standard LaTeX command delimiters \(...\) and \[...\]
  newResult = newResult.replace(/\\\((.*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[(.*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 2: Normalize explicit escaped dollar signs (e.g., \\$ -> $)
  // Applied carefully to parts not in placeholders
  const partsForStep2 = newResult.split(boxedPlaceholderPrefix);
  newResult = partsForStep2.map((part, index) => {
    if (index === 0) return part.replace(/\\?\$/g, '$');
    const [num, ...rest] = part.split("__");
    return `${num}__${rest.join("__").replace(/\\?\$/g, '$')}`;
  }).join(boxedPlaceholderPrefix);

  // Step B (from previous): Correct specific malformed pattern like $$\boxed{...}$\text{...}`
  // Needs to operate on text not yet perfectly boxed and placeholdere'd.
  newResult = newResult.replace(/(\$\$?\\s*\\boxed\{[^}]*?\})\s*\$?\s*(\\text\{[^}]*?\})\s*\$?\s*\$\$?/g, (match, box, textContent) => {
    const boxContent = box.replace(/\\boxed\{([\s\S]*)\}$/, '$1');
    return `$$\\boxed{${boxContent.trim()} ${textContent}}$$`;
  });

  // Step 3: Handle \boxed{...} if not part of a placeholder (e.g. if AI forgot $$)
  newResult = newResult.replace(/\s*\$\$?\s*(\\boxed\{[^}]*?\})\s*\$\$?\s*/g, '$1'); // Strip existing weak delimiters
  newResult = newResult.replace(/(\\boxed\{[^}]*?\})(?!\s*\$)/g, '$$$$$1$$');    // Re-wrap robustly

  // Step 4: Attempt to fix hanging $$ delimiters
  newResult = newResult.replace(/^(\$\$[^\$]+)$/gm, (match, content) => `${content.trim()}$$`);
  newResult = newResult.replace(/^([^\$]+\$\$)$/gm, (match, content) => `$$${content.trim()}`);

  // Step 5: Wrap remaining likely inline math (heuristic, very conservative)
  // This looks for common LaTeX commands or structures not already delimited.
  // Example: wrap "q_1 = 2 \times 10^{-9}" if it's bare.
  // This is hard to do perfectly. A simple heuristic:
  // If a segment contains a backslash command, numbers, and common math symbols, and isn't already delimited.
  // For now, this step is kept minimal to avoid over-wrapping.
  // The AI should be prompted to use delimiters. This function is mainly for cleanup.
  // A simple example: wrap 'ax^2 + bx + c = 0' if it's on its own and not delimited.
  // This regex is illustrative and would need to be very carefully crafted.
  // No aggressive general wrapping added here to avoid breaking plain text.

  // Step 6: Clean up repeated/redundant dollar signs
  newResult = newResult.replace(/\${3,}/g, '$$');
  newResult = newResult.replace(/^\$\s*\$\$(.*?)\$\$\s*\$$/gs, '$$$$$1$$'); // $ $$...$$ $ -> $$...$$
  newResult = newResult.replace(/^\$\$\s*\$([^\$]+)\$\s*\$\$$/gs, '$$$1$');    // $$ $...$ $$ -> $...$ (if $...$ is simple)

  // Step 7: Remove spaces immediately inside delimiters
  newResult = newResult.replace(/\$\s+([^$]*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+([^$]*?)\s+\$\$/gs, '$$$$$1$$');

  // Step 8: Final check for any single $ that might be left hanging
  newResult = newResult.replace(/^\s*\$\s*$/gm, '');

  // Step OMEGA: Restore original $$ \boxed{...} $$ placeholders
  boxedPlaceholders.forEach((placeholder, index) => {
    newResult = newResult.replace(`${boxedPlaceholderPrefix}${index}__`, placeholder);
  });

  return newResult.trim();
}
