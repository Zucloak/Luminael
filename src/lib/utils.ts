import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  let newResult = text;

  // Placeholder for correctly delimited $$...$$ blocks
  const placeholders: string[] = [];
  const placeholderPrefix = "__LATEX_BOXED_PLACEHOLDER_"; // More specific prefix

  // Step A: Temporarily replace well-formed $$ \boxed{...} $$ blocks
  // This regex is specific to $$ \boxed{...} $$
  newResult = newResult.replace(/(\$\$\s*\\boxed\{[\s\S]*?\}\s*\$\$)/g, (match) => {
    placeholders.push(match);
    return `${placeholderPrefix}${placeholders.length - 1}__`;
  });

  // Step B: Correct specific malformed pattern like $$\boxed{...}$\text{...}`
  // This should run on content *not* captured by the placeholder above.
  // This should capture $$\boxed{content inside box}$ and then the \text{part}
  newResult = newResult.replace(/(\$\$?\\s*\\boxed\{[^}]*?\})\s*\$?\s*(\\text\{[^}]*?\})\s*\$?\s*\$\$?/g, (match, box, textContent) => {
    // Combine them: remove closing brace of box, add text, add brace, wrap with $$
    const boxContent = box.replace(/\\boxed\{([\s\S]*)\}$/, '$1');
    return `$$\\boxed{${boxContent.trim()} ${textContent}}$$;`
  });


  // Step 0: Clean common AI artifacts
  newResult = newResult.replace(/ \$=/g, ' ='); // Clean " $=" to " ="
  newResult = newResult.replace(/\$=/g, '=');   // Clean "$=" to "="

  // Step 1: Convert standard LaTeX command delimiters \(...\) and \[...\] to $...$ and $$...$$
  newResult = newResult.replace(/\\\((.*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[(.*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 2: Normalize explicit escaped dollar signs from AI (e.g., \\$ -> $)
  // Be careful not to affect placeholders
  newResult = newResult.split(placeholderPrefix).map((part, index) => {
    if (index === 0) return part.replace(/\\?\$/g, '$');
    const [num, ...rest] = part.split("__");
    return `${num}__${rest.join("__").replace(/\\?\$/g, '$')}`;
  }).join(placeholderPrefix);


  // Step 3: Handle \boxed{...} specifically if not part of a placeholder. It should always be display style ($$).
  // Remove any existing $ or $$ immediately around a \boxed{} expression, and also leading/trailing newlines or spaces.
  newResult = newResult.replace(/\s*\$\$?\s*(\\boxed\{[^}]*?\})\s*\$\$?\s*/g, '$1');
  // Then, (re-)wrap all \boxed{...} expressions with $$...$$ to ensure display style.
  newResult = newResult.replace(/(\\boxed\{[^}]*?\})(?!\s*\$)/g, '$$$$$1$$');

  // Step 4: Attempt to fix hanging $$ delimiters or wrap content that looks like it starts with $$
  newResult = newResult.replace(/^(\$\$[^\$]+)$/gm, (match, content) => {
    if (content.endsWith('\n')) return `${content.trim()}$$`;
    return `${content}$$`;
  });
  newResult = newResult.replace(/^([^\$]+\$\$)$/gm, (match, content) => `$$${content}`);


  // Step 6: Clean up repeated/redundant dollar signs.
  newResult = newResult.replace(/\${3,}/g, '$$');
  newResult = newResult.replace(/^\$\s*\$\$(.*?)\$\$\s*\$$/gs, '$$$$$1$$');
  newResult = newResult.replace(/^\$\$\s*\$([^\$]+)\$\s*\$\$$/gs, '$$$1$');


  // Step 7: Remove spaces immediately inside delimiters, e.g., $ content $ -> $content$
  newResult = newResult.replace(/\$\s+([^$]*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+([^$]*?)\s+\$\$/gs, '$$$$$1$$');

  // Step 8: Final check for any single $ that might be left hanging at start/end of lines from previous ops.
  newResult = newResult.replace(/^\s*\$\s*$/gm, '');

  // Step C: Restore placeholders
  placeholders.forEach((placeholder, index) => {
    newResult = newResult.replace(`${placeholderPrefix}${index}__`, placeholder);
  });

  return newResult.trim();
}
