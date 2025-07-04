import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from 'lucide-react'; // Icon for whitepaper

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
  let pageTitle = "Luminael Whitepaper"; // Default title
  const titleMatch = markdownContent.match(/^#\s+(.*)/m);
  if (titleMatch && titleMatch[1]) {
    pageTitle = titleMatch[1];
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <FileText className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">{pageTitle}</CardTitle>
                {/* Optional: <CardDescription>A deep dive into the Luminael Protocol.</CardDescription> */}
            </CardHeader>
            <CardContent>
                <MarkdownRenderer className="prose dark:prose-invert lg:prose-xl max-w-none pt-2">
                    {markdownContent}
                </MarkdownRenderer>
            </CardContent>
        </Card>
    </div>
  );
}
