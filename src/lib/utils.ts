import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceLatexDelimiters(text: string): string {
  if (!text || typeof text !== 'string') return "";

  let newResult = text;

  // Step 0: Remove zero-width spaces and normalize some newlines early
  newResult = newResult.replace(/\u200B/g, '');
  newResult = newResult.replace(/([a-zA-Z])\s*\n\s*(\d+)\s*\n\s*=\s*/g, '$1_$2 = '); // C \n1\n = to C_1 =
  // Convert single newlines that are not preceded/followed by another newline (likely breaking inline math) to spaces
  newResult = newResult.replace(/(?<!\n)\n(?!\n)/g, ' ');
  // Preserve paragraph breaks (double newlines or more)
  newResult = newResult.replace(/\n{2,}/g, '\n\n');


  // Step 1: Remove \boxed{...} and ensure its content is prepped for display math
  // This regex captures the content inside \boxed{...}
  // It handles cases where \boxed might be wrapped by $ or $$ already, or not.
  newResult = newResult.replace(/\$\$?\s*\\boxed\{([\s\S]*?)\}\s*\$\$?/g, (match, content) => {
    return `$$${content.trim()}$$`; // Replace with content, wrapped in $$
  });
  // Handle cases where \text{} might be outside a \boxed{} but intended to be part of it
  // e.g., $$\boxed{10 \times 10^{-6}}$\text{ J}$$  ->  $$10 \times 10^{-6} \text{ J}$$
  newResult = newResult.replace(/(\$\$\s*[^$]*?\S)\s*\$\s*(\\text\{[^}]*?\})\s*\$\$/g, (match, mainMath, textContent) => {
    return `${mainMath.replace(/\$\$$/, '').trim()} ${textContent}$$`;
  });


  // Step 2: Clean common AI artifacts (like $=)
  newResult = newResult.replace(/ \$=/g, ' =');
  newResult = newResult.replace(/\$=/g, '=');

  // Step 3: Convert standard LaTeX command delimiters \(...\) and \[...\]
  newResult = newResult.replace(/\\\(([\s\S]*?)\\\)/gs, (match, content) => `$${content}$`);
  newResult = newResult.replace(/\\\[([\s\S]*?)\\\]/gs, (match, content) => `$$${content}$$`);

  // Step 4: Normalize explicit escaped dollar signs (e.g., \\$ -> $)
  newResult = newResult.replace(/\\?\$/g, '$');

  // Step 5: Attempt to fix hanging $$ delimiters
  // If a line starts with $$ but doesn't end with $$, add $$ at the end
  newResult = newResult.replace(/^(\$\$[^\$]+)$/gm, (match, content) => `${content.trim()}$$`);
  // If a line ends with $$ but doesn't start with $$, add $$ at the beginning
  newResult = newResult.replace(/^([^\$]+\$\$)$/gm, (match, content) => `$$${content.trim()}`);
  // If a line seems to be display math but is missing both, e.g. "foo = \frac{a}{b}"
  newResult = newResult.replace(/^([a-zA-Z0-9\s]*\\(?:frac|sum|int|lim|prod|text|mathrm|mathbf|mathcal|mathsf|mathtt|operatorname)[\s\S]*)$/gm, (match, content) => {
    if (!content.startsWith('$$') && !content.endsWith('$$') && !content.startsWith('$') && !content.endsWith('$')) {
      return `$$${content.trim()}$$`;
    }
    return content;
  });


  // Step 6: Clean up repeated/redundant dollar signs
  newResult = newResult.replace(/\${3,}/g, '$$'); // $$$ or more -> $$
  newResult = newResult.replace(/^\$\s*\$\$(.*?)\$\$\s*\$$/gs, '$$$$$1$$'); // $ $$...$$ $ -> $$...$$
  newResult = newResult.replace(/^\$\$\s*\$([^\$\s].*?[^\$\s])\$\s*\$\$$/gs, '$$$1$'); // $$ $content$ $$ -> $content$
  newResult = newResult.replace(/\$\$/g, (match, offset, fullString) => { // $$ appearing mid-string without being part of $$...$$
    const prevChar = fullString.charAt(offset -1);
    const nextChar = fullString.charAt(offset + 2);
    if (prevChar !== '\n' && prevChar !== '' && nextChar !== '\n' && nextChar !== '') {
        // If $$ is not at start/end of a line, it might be an error for inline math
        // This is heuristic; might be too aggressive or not aggressive enough.
    }
    return match; // For now, keep this less aggressive. The AI should use $ for inline.
  });


  // Step 7: Remove spaces immediately inside delimiters
  newResult = newResult.replace(/\$\s+([^$]*?)\s+\$/gs, '$$$1$');
  newResult = newResult.replace(/\$\$\s+([^$]*?)\s+\$\$/gs, '$$$$$1$$');

  // Step 8: Final check for any single $ that might be left hanging or empty $$/$
  newResult = newResult.replace(/^\s*\$\s*$/gm, ''); // Remove lines that are just a single $
  newResult = newResult.replace(/\$\s*\$/g, '');    // Remove empty $ $
  newResult = newResult.replace(/\$\$\s*\$\$/g, ''); // Remove empty $$ $$

  return newResult.trim();
}
