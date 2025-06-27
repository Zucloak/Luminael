"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { FileText, BrainCircuit, Sparkles, Wand2, Loader2, BookUp, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { summarizeText } from "@/ai/flows/summarizeTextFlow";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const quizSetupSchema = z.object({
  numQuestions: z.coerce.number().min(1, "Must have at least 1 question.").max(100, "Maximum 100 questions."),
  topics: z.string().min(3, "Topics must be at least 3 characters.").optional().or(z.literal("")),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  questionFormat: z.enum(["multipleChoice", "openEnded", "mixed"]).default("multipleChoice"),
});

type QuizSetupValues = z.infer<typeof quizSetupSchema>;

interface QuizSetupProps {
  onQuizStart: (fileContent: string, values: QuizSetupValues, isHellBound: boolean) => Promise<void>;
  isGenerating: boolean;
}

export function QuizSetup({ onQuizStart, isGenerating }: QuizSetupProps) {
  const [fileContent, setFileContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isHellBound, setIsHellBound] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 10,
      topics: "",
      difficulty: "Medium",
      questionFormat: "multipleChoice",
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileContent("");
      setOriginalContent("");
      const fileList = Array.from(files);
      setFileNames(fileList.map(f => f.name));
      setFileError("");
      setIsParsingFile(true);

      const readPromises = fileList.map(file => {
        return new Promise<string>((resolve, reject) => {
          if (file.type === "text/plain" || file.type === "text/markdown") {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(`Error reading ${file.name}.`);
            reader.readAsText(file);
          } else if (file.type === "application/pdf") {
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                if (!e.target?.result) return reject(`Failed to read ${file.name}.`);
                const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
                }
                resolve(fullText);
              } catch (error) {
                console.error("Error parsing PDF:", error);
                reject(`Could not read text from PDF: ${file.name}. It might be image-based.`);
              }
            };
            reader.onerror = () => reject(`Error reading ${file.name}.`);
            reader.readAsArrayBuffer(file);
          } else {
            reject(`Unsupported file type: ${file.name}. Please use .txt, .md, or .pdf.`);
          }
        });
      });

      try {
        const contents = await Promise.all(readPromises);
        const combinedContent = contents.join("\n\n---\n\n");
        setFileContent(combinedContent);
        setOriginalContent(combinedContent);
        setFileError("");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setFileError(message);
        setFileNames([]);
        setFileContent("");
        setOriginalContent("");
      } finally {
        setIsParsingFile(false);
      }
    }
  };

  const handleSummarize = async () => {
    if (!fileContent) {
      toast({ variant: 'destructive', title: 'No Content', description: 'Please upload a file first.' });
      return;
    }
    setIsSummarizing(true);
    try {
      const summary = await summarizeText(fileContent);
      setFileContent(summary);
      toast({ title: 'Content Summarized', description: 'The quiz will now be generated from the summary.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Summarization Failed', description: message });
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const handleUseOriginal = () => {
    setFileContent(originalContent);
    toast({ title: 'Using Original Content', description: 'The quiz will be generated from the full original text.' });
  }

  function onSubmit(values: QuizSetupValues) {
    if (!fileContent) {
      setFileError("Please upload one or more files and wait for them to be processed.");
      return;
    }
    onQuizStart(fileContent, values, isHellBound);
  }

  const isSummarized = fileContent !== originalContent && originalContent !== "";

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <BrainCircuit className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="font-headline text-4xl">Generate Your Quiz</CardTitle>
        <CardDescription className="text-lg">
          Upload your study materials, optionally summarize, and let AI create a custom quiz.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-2">
            <div className="space-y-2">
              <Label>1. Upload Content (.txt, .pdf, .md)</Label>
              <Input id="file-upload" type="file" multiple onChange={handleFileChange} accept=".txt,.pdf,.md" className="pt-2 file:text-primary file:font-semibold" disabled={isParsingFile || isGenerating} />
              {isParsingFile && (
                 <p className="text-sm text-muted-foreground pt-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing files...
                 </p>
              )}
              {fileNames.length > 0 && !isParsingFile && (
                <div className="text-sm text-muted-foreground pt-2 space-y-2">
                  <strong>Uploaded files:</strong>
                  <ul className="list-disc pl-5 space-y-1 max-h-24 overflow-y-auto">
                    {fileNames.map((name) => (
                      <li key={name} className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate" title={name}>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
            </div>

            {originalContent && !isParsingFile && (
              <div className="space-y-4 animate-in fade-in-50">
                <Label>2. Review &amp; Summarize (Optional)</Label>
                <div className="p-4 border rounded-md space-y-4 bg-background">
                  <Textarea value={fileContent} readOnly rows={8} className="bg-muted/50" />
                  <div className="flex flex-wrap gap-2">
                     <Button type="button" onClick={handleSummarize} disabled={isSummarizing || isGenerating || isSummarized}>
                        {isSummarizing ? <Loader2 className="animate-spin" /> : <BookUp />}
                        {isSummarized ? "Content is Summarized" : "Summarize Content"}
                    </Button>
                    {isSummarized && (
                       <Button type="button" variant="outline" onClick={handleUseOriginal} disabled={isGenerating}>
                          <RefreshCcw />
                          Use Original
                      </Button>
                    )}
                  </div>
                   <FormDescription>
                    {isSummarized ? "The quiz will be based on the summary. Click 'Use Original' to revert." : "You can summarize long documents to focus the quiz on key points."}
                  </FormDescription>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>3. Configure Your Quiz</Label>
              <div className="p-4 border rounded-md space-y-4 bg-background">
                <FormField
                  control={form.control}
                  name="numQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Questions</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={isGenerating}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-2 p-4 bg-destructive/10 rounded-md border border-destructive/20">
                  <Wand2 className="h-8 w-8 text-destructive" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="hell-bound-mode" className="text-destructive font-bold">HELL BOUND MODE</Label>
                    <p className="text-xs text-destructive/80">Generate an extremely difficult quiz to truly test your knowledge.</p>
                  </div>
                  <Switch
                    id="hell-bound-mode"
                    checked={isHellBound}
                    onCheckedChange={setIsHellBound}
                    disabled={isGenerating}
                  />
                </div>
                {!isHellBound && (
                  <div className="space-y-4 animate-in fade-in-0 duration-300">
                     <FormField
                      control={form.control}
                      name="questionFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGenerating}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="multipleChoice">Multiple Choice</SelectItem>
                              <SelectItem value="openEnded">Problem Solving</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topics to Cover (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Chapter 1, Photosynthesis" {...field} disabled={isGenerating}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGenerating}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isGenerating || isParsingFile}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : isParsingFile ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing files...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Quiz
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
