import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
// Card components and FileText icon are removed as per new layout direction for this page

export const metadata: Metadata = {
  title: 'Whitepaper - Luminael AI',
  description: 'Luminael Protocol Whitepaper: Decentralized, AI-Powered Universal Learning.',
};

async function getWhitepaperContent(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'WHITEPAPER.md');
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.error("Failed to read whitepaper content:", error);
    return "# Error\nCould not load whitepaper content. Please try again later."; // Return Markdown error
  }
}

export default async function WhitepaperPage() {
  const markdownContent = await getWhitepaperContent();

  // Extract H1 from markdown to use as title, or use a default
  // This is a simplified way; a more robust Markdown parser might be better for complex cases.
  let pageTitle = "The Luminael Protocol Whitepaper"; // Default title
  const titleMatch = markdownContent.match(/^#\s+(.*)/m);
  if (titleMatch && titleMatch[1]) {
    // pageTitle = titleMatch[1]; // Use the extracted title from Markdown if preferred
    // For now, let's use a fixed page title for the H1, Markdown will have its own H1.
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl prose dark:prose-invert lg:prose-xl">
      <h1 className="text-3xl font-bold mb-6 font-headline text-center">
        {pageTitle}
      </h1>
      {/*
        A "Last Updated" date might be less relevant for a whitepaper if its content is fairly static,
        or could be hardcoded if there's a specific publication date.
        For now, omitting it unless the Markdown itself contains it or it's requested.
        <p className="mb-6 text-center text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
      */}
      <MarkdownRenderer>
        {/* Removed prose classes from here as parent has them */}
        {markdownContent}
      </MarkdownRenderer>
    </div>
  );
}
