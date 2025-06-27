// This is a Next.js Client Component, responsible for the entire UI and user interaction.
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Wand, Save, CheckCircle } from 'lucide-react';

export default function SummarizePage() {
  // State to manage the entire workflow on the client-side
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [finalContent, setFinalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  /**
   * Handles file selection. Reads the file content locally in the browser
   * using FileReader. This is token-efficient as no data is sent to the server yet.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states for new file upload
    setFileContent('');
    setSummary('');
    setEditedContent('');
    setFinalContent('');
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);
    };
    reader.onerror = () => {
        setError('Failed to read file.');
        toast({ variant: 'destructive', title: 'Error', description: 'Could not read the selected file.' });
    }
    reader.readAsText(file);
  };

  /**
   * Sends the raw text content to the backend API route, which then
   * triggers the Genkit AI flow for summarization.
   */
  const handleSummarize = async () => {
    if (!fileContent) {
      toast({ variant: 'destructive', title: 'No Content', description: 'Please upload a file first.' });
      return;
    }
    setIsLoading(true);
    setSummary('');
    setEditedContent('');
    
    try {
      const response = await fetch('/api/summarize-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to get summary from the server.');
      }

      const data = await response.json();
      setSummary(data.summary);
      setEditedContent(data.summary); // Pre-fill the editor with the summary
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Summarization Failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * This is the "write" part of the workflow. It's a client-side action
   * to finalize the edited text and display it.
   */
  const handleSave = () => {
    setFinalContent(editedContent);
    toast({ title: 'Content Saved', description: 'Your edited text has been saved locally.' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-start justify-center">
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Document Summarizer
            </CardTitle>
            <CardDescription>
              Upload a `.txt` or `.md` file, get an AI summary, and edit the result.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step 1: File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="font-semibold text-lg">1. Upload Document</Label>
              <Input id="file-upload" type="file" onChange={handleFileChange} accept=".txt,.md" disabled={isLoading} className="file:text-primary file:font-semibold" />
              {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {/* Step 2: Document Preview & Summarize Action */}
            {fileContent && (
              <div className="space-y-4 animate-in fade-in-50">
                <div>
                    <Label className="font-semibold text-lg">2. Document Preview</Label>
                    <Textarea value={fileContent} readOnly rows={8} className="mt-2 bg-muted/50" />
                </div>
                <Button onClick={handleSummarize} disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Wand />}
                  Summarize Document
                </Button>
              </div>
            )}
            
            {/* Step 3: AI Summary & Editor */}
            {(isLoading || summary) && (
                 <div className="space-y-4 animate-in fade-in-50">
                    <Label className="font-semibold text-lg">3. AI-Generated Summary (Editable)</Label>
                    {isLoading && !summary && (
                        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Generating summary...</p>
                        </div>
                    )}
                    {summary && (
                        <Textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={10}
                            placeholder="AI summary will appear here. You can edit it directly."
                            className="focus:border-primary"
                        />
                    )}
                     {summary && (
                        <Button onClick={handleSave} className="w-full md:w-auto">
                            <Save />
                            Save Edited Content
                        </Button>
                    )}
                 </div>
            )}

             {/* Step 4: Final Content Display */}
            {finalContent && (
                <div className="space-y-2 animate-in fade-in-50">
                    <Label className="font-semibold text-lg flex items-center gap-2">
                        <CheckCircle className="text-accent" />
                        Final Saved Content
                    </Label>
                    <div className="p-4 border rounded-md bg-accent/10 whitespace-pre-wrap">
                        {finalContent}
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">This entire process is token-efficient. The file is read in your browser, and only the text is sent to the AI for summarization.</p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
