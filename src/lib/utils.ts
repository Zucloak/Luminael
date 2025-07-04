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
  // Added 's' flag for dotall mode, so '.' matches newline characters.
  let result = text.replace(/\\\((.*?)\\\)/gs, (match, capturedContent) => `\$${capturedContent}\$`);
  // Replace \[...\] with $$...$$
  result = result.replace(/\\\[(.*?)\\\]/gs, (match, capturedContent) => `\$\$${capturedContent}\$\$`);

  // Wrap standalone \boxed{...} with $$...$$ if not already properly delimited by $ or $$
  // This regex looks for \boxed{...} that isn't immediately preceded by a $ or followed by a $
  // and also not preceded by $$ or followed by $$
  // It's a bit complex due to avoiding double wrapping.
  // A simpler, potentially less perfect but safer first pass might be:
  // result = result.replace(/(\\boxed\{.*?\})/g, (match) => {
  //   // Avoid wrapping if it's already correctly inside $$...$$ or $...$
  //   // This check is difficult with regex alone without lookbehinds that check for PAIRS of $
  //   // For now, let's assume if it's not starting with $$, we wrap it.
  //   // This might double-wrap if AI does $\boxed{...}$ but that's less harmful than no delimiters.
  //   if (!match.startsWith('\$\$') && !match.startsWith('\$')) { // Basic check
  //      return `\$\$${match}\$\$`;
  //   }
  //   return match;
  // });
  // More robust approach for \boxed:
  // This regex specifically finds \boxed{...} that is NOT already enclosed in $...$ or $$...$$
  // It uses negative lookbehind and lookahead.
  // (?<!\$) - not preceded by a $
  // (?<!\$\$)- not preceded by $$ (this part is tricky with lookbehinds, let's simplify)
  // A simpler strategy: wrap all \boxed, then clean up double $$ if any.
  // Or, more simply, ensure \boxed is treated as display math.
  // The AI should be prompted to put \$\$ \boxed{} \$\$. This function is a fallback.

  // If \boxed{...} is found and NOT immediately part of an existing $...$ or $$...$$
  // This regex is hard to make perfect without complex lookarounds.
  // Let's try a simpler approach: if we find \boxed, and the characters immediately
  // around it are not dollar signs, then wrap it.

  // This will wrap any \boxed{...} with $$...$$
  // We rely on the AI prompt to ideally get it right first.
  // This step is a fallback. If AI does $\boxed{}$, this will make it $\$\$\boxed{}\$\$$.
  // If AI does $$\boxed{}$$, it remains unchanged.
  // If AI does \boxed{}, it becomes $$\boxed{}$$.
  result = result.replace(/\\boxed\{(.*?)\}/g, (match, capturedContent) => {
    // Check if the match is already within $...$ or $$...$$
    // This is hard to do reliably with regex replace alone on the whole text.
    // The prompt is the primary place to enforce \$\$ \boxed{} \$\$.
    // This replacement will ensure that if \boxed{} appears, it gets display math delimiters
    // potentially re-wrapping if AI put $ \boxed{} $
    return `\$\\$\\\\boxed{${capturedContent}}\$\\$`;
  });

  // Cleanup potential double $$ from the above if AI had already put single $
  // e.g., $\$\$ \boxed{} \$\$$ -> $$ \boxed{} $$
  result = result.replace(/\$\$\$\$(.*?)\$\$\$\$/g, '\$\$ $1 \$\$'); // for $$$$content$$$$
  result = result.replace(/\$\$\$(.*?)\$\$\$/g, '\$\$ $1 \$\$');   // for $$$content$$$ (less likely)


  return result;
}
