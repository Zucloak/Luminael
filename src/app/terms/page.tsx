import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollText } from 'lucide-react'; // Icon for Terms

export const metadata: Metadata = {
  title: 'Terms of Service - Luminael AI',
  description: 'Luminael AI Terms of Service.',
};

async function getTermsContent(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'TERMS.md');
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.error("Failed to read terms of service content:", error);
    return "# Error\nCould not load terms of service content. Please try again later.";
  }
}

export default async function TermsOfServicePage() {
  const markdownContent = await getTermsContent();

  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <ScrollText className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">Terms of Service</CardTitle>
                {/* <CardDescription>Please read these terms carefully.</CardDescription> */}
                <p className="text-sm text-muted-foreground pt-2">Last Updated: {new Date().toLocaleDateString()}</p>
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
