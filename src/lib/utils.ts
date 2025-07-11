import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  // Step 0: Remove all tab characters globally, as they interfere with parsing and are not needed.
  let result = text.replace(/\t/g, '');

  // Placeholders for correctly delimited $$ \boxed{...} $$ blocks
  const boxedPlaceholders: string[] = [];
  const BOXED_PLACEHOLDER_PREFIX = "__LATEX_BOXED_PLACEHOLDER_";

  // Step A (Alpha): Protect correctly formed $$ \boxed{...} $$
  // This is critical because \boxed{} can contain complex LaTeX that other rules might break.
  result = result.replace(/(\$\$\s*\\boxed\{[\s\S]*?\}\s*\$\$)/g, (match) => {
    boxedPlaceholders.push(match);
    return `${BOXED_PLACEHOLDER_PREFIX}${boxedPlaceholders.length - 1}__`;
  });

  // Step AA: Convert AI's common error of using \\$ as delimiters to $$...$$
  // This specifically targets the AI's mistake of outputting e.g. \\$\int x dx\\$
  // We convert it to $$...$$ because these are almost always display math.
  // This runs before other transformations to prevent interference.
  // It's applied to the whole string, trusting that legitimate uses of \\$...\\$ (literal escaped dollars at start/end of a phrase) are rare in this context.
  // This is a targeted fix for a persistent AI error pattern.
  // (?<!\\) ensures we don't match an already escaped backslash, e.g. \\\\$ which means literal \\ followed by $
  result = result.replace(/(?<!\\)\\\$([\s\S]*?)(?<!\\)\\\$/gs, (match, content) => {
    // console.log(`[replaceLatexDelimiters Step AA] Correcting AI's \\$ delimiter error: "${match}" to "$$${content.trim()}$$"`);
    return `$$${content.trim()}$$`;
  });

  // Step B: Remove zero-width spaces (U+200B) which can break LaTeX rendering.
  // This is done after placeholder replacement to avoid altering placeholder markers.
  const partsForZeroWidthRemoval = result.split(BOXED_PLACEHOLDER_PREFIX);
  result = partsForZeroWidthRemoval.map((part, index) => {
    if (index === 0) return part.replace(/\u200B/g, ''); // Process the first part
    // For subsequent parts, only process text after the placeholder ID
    const placeholderIdEndIndex = part.indexOf("__");
    if (placeholderIdEndIndex === -1) return part.replace(/\u200B/g, ''); // Should not happen
    const placeholderId = part.substring(0, placeholderIdEndIndex + 2);
    const restOfPart = part.substring(placeholderIdEndIndex + 2);
    return `${placeholderId}${restOfPart.replace(/\u200B/g, '')}`;
  }).join(BOXED_PLACEHOLDER_PREFIX);


  // Step C: Normalize multiple newlines to a maximum of two (paragraph breaks).
  result = result.replace(/\n{3,}/g, '\n\n');

  // Step D: Clean common AI artifacts like "$=" without space, or " $=" with leading space.
  // These should not interfere with LaTeX processing if done carefully.
  result = result.replace(/ \$=/g, ' ='); // " $= " -> " = "
  result = result.replace(/\$=/g, '=');   // "$=" -> "="

  // Step E: Convert \(...\) to $...$ and \[...\] to $$...$$
  // This aligns with the AI prompt that asks for $ and $$ delimiters.
  // Handles one or more backslashes before ( and [
  result = result.replace(/\\+\(([\s\S]*?)\\+\)/gs, (match, content) => `$${content.trim()}$`);
  result = result.replace(/\\+\[([\s\S]*?)\\+\]/gs, (match, content) => `$$${content.trim()}$$`);

  // Step F: REMOVED - The original Step 2 (Normalize all escaped dollar signs \\$ to $) was too dangerous.
  // It would convert intentional literal dollar signs (e.g., for currency) into math delimiters.
  // The AI is explicitly prompted to use $...$ and $$...$$ for math, and \\$ for literal $.
  // So, we should trust the AI's output for \\$ or fix it in the prompt if it's misusing it.

  // Step G: Fix AI error where display math uses an inline closer (e.g., $$content$)
  // This looks for $$ followed by content, then a single $ that's at the end of a line or followed by space/punctuation.
  // Ensures the character before the single $ is not itself a $ (to avoid $$...$$ becoming $$$...$$$).
  result = result.replace(/(\$\$[\s\S]*?[^\$])\$(\s|$|[,.;?!])/g, '$1\$\$$2');

  // Step H: Address \boxed{...} if it's NOT already correctly wrapped in $$...$$ (which Step A handles)
  // This targets cases where the AI might output just \boxed{...} or $ \boxed{...} $.
  // We want to ensure these are display math.
  // This regex avoids matching if already part of a placeholder.
  const partsForBoxedFix = result.split(BOXED_PLACEHOLDER_PREFIX);
  result = partsForBoxedFix.map((part, index) => {
    let currentPart = part;
    if (index > 0) { // Reconstruct the part if it was split
        const placeholderIdEndIndex = part.indexOf("__");
        if (placeholderIdEndIndex !== -1) {
            currentPart = part.substring(placeholderIdEndIndex + 2);
        }
    }

    // If \boxed is found not properly wrapped, wrap it with $$
    // Ensure it's not already preceded by $$ or followed by $$ closely.
    // This is tricky; the primary reliance is on AI prompt and Step A for correct $$ \boxed{} $$
    // A simpler approach: if we find `\boxed` that wasn't caught by Step A,
    // it's likely missing its `$$` delimiters.
    // This step is risky if `\boxed` is legitimately used inline (though rare and usually bad practice).
    // The prompt specifically asks for `$$ \boxed{...} $$`.
    // So, if we find `\boxed` not in a placeholder, it's likely an error.
    // Let's be conservative: only wrap if it's clearly standalone or $...$-wrapped.
    currentPart = currentPart.replace(/(?<!\$)\$\s*(\\boxed\{[\s\S]*?\})\s*\$(?!\$)/g, `\$\$ $1 \$\$`); // $ \boxed{} $ -> $$ \boxed{} $$
    currentPart = currentPart.replace(/^(\s*\\boxed\{[\s\S]*?\})\s*$/gm, `\$\$ $1 \$\$`); // \boxed{} (alone on line) -> $$ \boxed{} $$

    if (index === 0) return currentPart;
    const placeholderId = part.substring(0, part.indexOf("__") + 2);
    return `${placeholderId}${currentPart}`;

  }).join(BOXED_PLACEHOLDER_PREFIX);


  // Step I: Clean up repeated/redundant dollar signs.
  // $$$... -> $$...
  // ...$$$ -> ...$$
  // $ $ $ -> $ (should be caught by space removal or specific patterns)
  // $$ $$ -> $$ (empty display math)
  result = result.replace(/\${3,}/g, '$$'); // Three or more $ become $$
  result = result.replace(/\$\s+\$/g, '$'); // $ whitespace $ becomes $ (for empty inline) - careful not to break $ word $
  result = result.replace(/\$\$\s+\$\$/g, '$$'); // $$ whitespace $$ becomes $$ (for empty display)

  // Step HH: Promote $...$ to $$...$$ for likely display math content
  // This targets expressions containing \int, \sum, \frac (as primary element),
  // or newlines, when wrapped in single $ signs.
  // This step is applied *after* \boxed has been handled (Step A and H) and before general space trimming within delimiters.
  const partsForDisplayPromotion = result.split(BOXED_PLACEHOLDER_PREFIX);
  result = partsForDisplayPromotion.map((part, index) => {
    let currentPart = part;
    // Only process text outside of the placeholder IDs themselves
    if (index > 0) {
      const placeholderIdEndIndex = part.indexOf("__");
      if (placeholderIdEndIndex !== -1) {
        currentPart = part.substring(placeholderIdEndIndex + 2);
      } else {
         // This case should ideally not be reached if placeholders are structured correctly
        currentPart = ""; // Or handle as an error/log
      }
    }

    // Regex to find patterns like: $ \int ... $, $ \frac{...}{...} $, $ ... \n ... $
    // It captures the content *inside* the single dollar signs.
    currentPart = currentPart.replace(
      /\$([\s\S]*?)\$/gs, (match, content) => {
        const trimmedContent = content.trim();
        // Check for display math indicators. More assertive now.
        const isLikelyDisplayMath =
          trimmedContent.includes('\\int') ||
          trimmedContent.includes('\\sum') ||
          trimmedContent.includes('\\prod') ||
          trimmedContent.includes('\\lim') ||
          trimmedContent.includes('\\oint') ||
          (trimmedContent.includes('\\frac') && trimmedContent.length > 15 && !trimmedContent.match(/[a-zA-Z0-9]\s*\\frac/)) || // Heuristic: \frac in longer expressions, not immediately following a char/num
          trimmedContent.includes('\n') ||
          trimmedContent.startsWith('\\begin{'); // Good for environments

        if (isLikelyDisplayMath) {
          // Avoid re-processing if it accidentally matches something already display-like from \boxed
          // or if the content itself is just a placeholder marker (though unlikely here)
          if (content.includes(BOXED_PLACEHOLDER_PREFIX) || content.includes("__LATEX_BOXED_PLACEHOLDER_")) { // check both just in case
            return match; // Don't change if it contains a placeholder
          }
          // Ensure we are not dealing with something that is already $$...$$ internally by mistake
          if (trimmedContent.startsWith('$') && trimmedContent.endsWith('$')) {
             // This could be nested $$ inside $, which is unlikely or already an error.
             // Or it could be the AI literally outputting "$$...$$" inside a "$...$"
             // If it's $ $$...$$ $, we want $$...$$
             const innerContent = trimmedContent.substring(1, trimmedContent.length -1);
             if (innerContent.trim().startsWith('$') && innerContent.trim().endsWith('$')) { // e.g. $ $  $$content$$  $ $
                // it's $ $$ content $$ $
                // return innerContent; // just return the $$content$$
                // safer: just return the original match to avoid complex logic here.
                // The outer $$ will be handled by later rules if this is $ $$...$$ $
                return `$$${innerContent.substring(1, innerContent.length-1).trim()}$$`;
             }
          }
          // console.log(`[replaceLatexDelimiters] Promoting to display math: ${match}`);
          return `$$${trimmedContent}$$`;
        }
        return match; // Return original if not display math
      }
    );

    if (index === 0) return currentPart;
    // Re-attach the placeholder ID part
    const placeholderId = part.substring(0, part.indexOf("__") + 2);
    return `${placeholderId}${currentPart}`;
  }).join(BOXED_PLACEHOLDER_PREFIX);


  // Step J: Remove spaces immediately inside delimiters if content exists.
  result = result.replace(/\$\s+([\s\S]+?)\s+\$/gs, (match, content) => `$${content.trim()}$`);
  result = result.replace(/\$\$\s+([\s\S]+?)\s+\$\$/gs, (match, content) => `$$${content.trim()}$$`);

  // Step K: Final check for empty math modes $$, $ $ or $$ $$, etc.
  // These can sometimes result from other replacements.
  result = result.replace(/^\s*\$(?:\s*)\$\s*$/gm, ''); // Remove lines with only $ $ or $
  result = result.replace(/^\s*\$\$(?:\s*)\$\$\s*$/gm, ''); // Remove lines with only $$ $$ or $$

  // Step L (Omega): Restore original $$ \boxed{...} $$ placeholders
  boxedPlaceholders.forEach((placeholder, idx) => {
    result = result.replace(`${BOXED_PLACEHOLDER_PREFIX}${idx}__`, placeholder);
  });

  return result.trim();
}
