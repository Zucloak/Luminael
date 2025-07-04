import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck } from 'lucide-react'; // Icon for Privacy Policy

export const metadata: Metadata = {
  title: 'Privacy Policy - Luminael AI',
  description: 'Luminael AI Privacy Policy: Your Privacy is Our Default.',
};

async function getPrivacyPolicyContent(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'PRIVACY.md');
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    console.error("Failed to read privacy policy content:", error);
    return "# Error\nCould not load privacy policy content. Please try again later.";
  }
}

export default async function PrivacyPolicyPage() {
  const markdownContent = await getPrivacyPolicyContent();

  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">Privacy Policy</CardTitle>
                <CardDescription>Your Privacy is My Default Priority.</CardDescription>
                 {/* The "Last Updated" date can be managed here if not part of Markdown */}
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
