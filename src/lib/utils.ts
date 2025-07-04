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
  result = result.replace(/\\\[(.*?)\\\]/gs, (match, capturedContent) => `\$\$${capturedContent}\$\$`);

  // Handle \boxed{...} specifically to ensure it becomes $$ \boxed{...} $$
  // Step 1: Temporarily protect already correctly double-dollared \boxed commands
  const correctlyDelimitedBoxedPlaceholder = "CORRECTLY_DELIMITED_BOXED_TEMP_PLACEHOLDER";
  const tempResultArray: string[] = [];
  let lastIndex = 0;

  result.replace(/\$\$\\s*(\\boxed\{.*?\})\s*\$\$/gs, (match, boxedContent, offset) => {
    tempResultArray.push(result.substring(lastIndex, offset));
    tempResultArray.push(correctlyDelimitedBoxedPlaceholder + tempResultArray.length); // Unique placeholder
    lastIndex = offset + match.length;
    return match; // Doesn't matter what's returned here, we're rebuilding
  });
  tempResultArray.push(result.substring(lastIndex));
  result = tempResultArray.join('');

  const protectedBoxedContents: string[] = [];
  result = result.replace(new RegExp(correctlyDelimitedBoxedPlaceholder + "(\\d+)", "g"), (match, id) => {
      // This part is tricky, we need to store the actual content that was replaced by placeholder
      // The initial replacement of $$ \boxed $$ should have just put a placeholder for the $$ \boxed $$ part.
      // Let's rethink the protection strategy.
      // Simpler: First, ensure all \boxed are wrapped in $$. Then clean up.
      return match; // This protection strategy is getting too complex.
  });


  // Simpler strategy for \boxed:
  // 1. Ensure any \boxed{...} is wrapped by \$\$...\$\$ (this might create \$\$\$\boxed{}\$\$\$ or \$\$\boxed{}\$\$)
  result = result.replace(/(\\boxed\{.*?\})/g, (match) => `\$\$${match}\$\$`);

  // 2. Clean up multiple dollar signs around \boxed or other content.
  //    Reduce $$$$ ... $$$$ to $$ ... $$
  result = result.replace(/\$\$\$\$\s*(.*?)\s*\$\$\$\$/gs, `\$\$ $1 \$\$`);
  //    Reduce $$$ ... $$$ to $$ ... $$
  result = result.replace(/\$\$\$\s*(.*?)\s*\$\$\$/gs, `\$\$ $1 \$\$`);
  //    Reduce $$ $ ... $ $$ to $$ ... $$ (handles if AI did $ \boxed{} $ and we wrapped it)
  result = result.replace(/\$\$(\s*\$.*?\$\s*)\$\$/gs, `\$\$ $1 \$\$`);
  //    Reduce $ $$ ... $$ $ to $$ ... $$ (handles if AI did $ \boxed{} $ and we wrapped it another way)
  result = result.replace(/\$\s*\$\$(.*?)\$\$\s*\$/gs, `\$\$ $1 \$\$`);


  // Final check: ensure any remaining single $ around a \boxed is promoted to $$
  result = result.replace(/\$\s*(\\boxed\{.*?\})\s*\$/gs, `\$\$ $1 \$\$`);


  return result;
}
