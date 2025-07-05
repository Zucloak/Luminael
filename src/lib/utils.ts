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
  newResult = newResult.replace(/([a-zA-Z])\s*\n\s*(\d+)\s*\n\s*=\s*/g, '$1_$2 = ');
  newResult = newResult.replace(/(?<!\n)\n(?!\n)/g, ' ');
  newResult = newResult.replace(/\n{2,}/g, '\n\n');

  // Step 0: Clean common AI artifacts (like $=)
  newResult = newResult.replace(/ \$=/g, ' =');
  newResult = newResult.replace(/\$=/g, '=');

  // Step 1: Convert standard LaTeX command delimiters \(...\) and \[...\]
  newResult = newResult.replace(/\\\(([\s\S]*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[([\s\S]*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 2: Normalize explicit escaped dollar signs (e.g., \\$ -> $)
  const partsForStep2 = newResult.split(boxedPlaceholderPrefix);
  newResult = partsForStep2.map((part, index) => {
    if (index === 0) return part.replace(/\\?\$/g, '$');
    const [num, ...rest] = part.split("__");
    return `${num}__${rest.join("__").replace(/\\?\$/g, '$')}`;
  }).join(boxedPlaceholderPrefix);

  // Step B (from previous, for malformed boxed with text outside):
  newResult = newResult.replace(/(\$\$?\\s*\\boxed\{[^}]*?\})\s*\$?\s*(\\text\{[^}]*?\})\s*\$?\s*\$\$?/g, (match, box, textContent) => {
    const boxContent = box.replace(/\\boxed\{([\s\S]*)\}$/, '$1');
    return `$$\\boxed{${boxContent.trim()} ${textContent}}$$`;
  });

  // Step 3: Handle \boxed{...} if not part of a placeholder (e.g. if AI forgot $$)
  newResult = newResult.replace(/\s*\$\$?\s*(\\boxed\{[^}]*?\})\s*\$\$?\s*/g, '$1');
  newResult = newResult.replace(/(\\boxed\{[^}]*?\})(?!\s*\$)/g, '$$$$$1$$');

  // Step 4: Attempt to fix hanging $$ delimiters
  newResult = newResult.replace(/^(\$\$[^\$]+)$/gm, (match, content) => `${content.trim()}$$`);
  newResult = newResult.replace(/^([^\$]+\$\$)$/gm, (match, content) => `$$${content.trim()}`);

  // Step 6: Clean up repeated/redundant dollar signs
  newResult = newResult.replace(/\${3,}/g, '$$');
  newResult = newResult.replace(/^\$\s*\$\$(.*?)\$\$\s*\$$/gs, '$$$$$1$$');
  newResult = newResult.replace(/^\$\$\s*\$([^\$\s].*?[^\$\s])\$\s*\$\$$/gs, '$$$1$');

  // Step 7: Remove spaces immediately inside delimiters
  newResult = newResult.replace(/\$\s+([^$]*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+([^$]*?)\s+\$\$/gs, '$$$$$1$$');

  // Step 8: Final check for any single $ that might be left hanging or empty $$/$
  newResult = newResult.replace(/^\s*\$\s*$/gm, '');
  newResult = newResult.replace(/\$\s*\$/g, '');
  newResult = newResult.replace(/\$\$\s*\$\$/g, '');

  // Step OMEGA: Restore original $$ \boxed{...} $$ placeholders
  boxedPlaceholders.forEach((placeholder, index) => {
    newResult = newResult.replace(`${boxedPlaceholderPrefix}${index}__`, placeholder);
  });

  return newResult.trim();
}
