
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { useApiKey } from "@/hooks/use-api-key";
import { PulsingCore } from "@/components/common/PulsingCore";
import { PulsingCoreRed } from "../common/PulsingCoreRed";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.mjs`;

async function ocrImage(imageDataUrl: string, apiKey: string | null): Promise<string> {
  const response = await fetch('/api/extract-text-from-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, apiKey }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 429 || responseText.includes('quota')) {
      throw new Error("You've exceeded the AI processing quota for the free tier, which has a daily limit. Please try again with a smaller document or try again tomorrow.");
    }
    
    let errorDetails = responseText;
    try {
      const errorData = JSON.parse(responseText);
      errorDetails = errorData.details || errorData.error || "An unknown server error occurred.";
    } catch (e) {
      errorDetails = responseText.substring(0, 200) + '...';
    }
    throw new Error(`${errorDetails}`);
  }

  try {
    const data = JSON.parse(responseText);
    return data.extractedText;
  } catch (e) {
    throw new Error("Failed to parse successful server response.");
  }
}

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d');
  if (!context) return true;

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0xFFFFFFFF && color !== 0);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const RATE_LIMIT_DELAY = 5000; // ~12 requests/minute, safely under the 15 req/min free tier limit

const quizSetupSchema = z.object({
  numQuestions: z.coerce.number().min(1, "Must have at least 1 question.").max(100, "Maximum 100 questions."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  questionFormat: z.enum(["multipleChoice", "openEnded", "mixed"]).default("multipleChoice"),
});

type QuizSetupValues = z.infer<typeof quizSetupSchema>;

interface QuizSetupProps {
  onQuizStart: (fileContent: string, values: QuizSetupValues) => Promise<void>;
  isGenerating: boolean;
  isHellBound: boolean;
  onHellBoundToggle: (checked: boolean) => void;
}

export function QuizSetup({ onQuizStart, isGenerating, isHellBound, onHellBoundToggle }: QuizSetupProps) {
  const [combinedContent, setCombinedContent] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0, message: "" });
  const { apiKey } = useApiKey();

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 10,
      difficulty: "Medium",
      questionFormat: "multipleChoice",
    },
  });

  const processFile = (file: File): Promise<{ content: string; aiCallMade: boolean; }> => {
    return new Promise(async (resolve, reject) => {
      if (file.type === "text/plain" || file.type === "text/markdown") {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ content: e.target?.result as string, aiCallMade: false });
        reader.onerror = () => reject(`Error reading ${file.name}.`);
        reader.readAsText(file);
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(`Failed to read ${file.name}.`);
            const imageDataUrl = e.target.result as string;

            try {
                // Step 1: Try local OCR with Tesseract.js first
                setParseProgress({ current: 0, total: 100, message: "Attempting local OCR..." });
                const { data: { text: localText, confidence } } = await Tesseract.recognize(
                    imageDataUrl,
                    'eng', // language
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                const progress = Math.floor(m.progress * 100);
                                setParseProgress({ current: progress, total: 100, message: `Local OCR: ${m.status} (${progress}%)` });
                            }
                        }
                    }
                );

                // Step 2: If local OCR is good enough, use it.
                if (localText && localText.trim().length > 20 && confidence > 60) {
                    setParseProgress({ current: 100, total: 100, message: "Local OCR successful!" });
                    resolve({ content: localText, aiCallMade: false });
                    return;
                }

                // Step 3: If local OCR fails or is poor, fall back to AI OCR.
                setParseProgress({ current: 1, total: 1, message: "Local OCR insufficient. Falling back to AI OCR..." });
                const aiText = await ocrImage(imageDataUrl, apiKey);
                resolve({ content: aiText, aiCallMade: true });

            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                reject(`OCR failed for ${file.name}: ${message}`);
            }
        };
        reader.onerror = () => reject(`Error reading ${file.name}.`);
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (!e.target?.result) return reject(`Failed to read ${file.name}.`);
          try {
            const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            
            let allPagesText: string[] = [];
            let anyAiCallMade = false;
            setParseProgress({ current: 0, total: pdf.numPages, message: "Reading PDF..." });

            for (let i = 1; i <= pdf.numPages; i++) {
              setParseProgress(prev => ({ ...prev, current: i, message: `Processing page ${i} of ${pdf.numPages}` }));
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              let pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ').trim();
              
              let ocrAttemptedOnPage = false;
              if (pageText.length < 20) {
                ocrAttemptedOnPage = true;
                anyAiCallMade = true;
                setParseProgress(prev => ({ ...prev, current: i, message: `Page ${i} is image-based, using AI OCR...` }));
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };
                await page.render(renderContext).promise;

                if (!isCanvasBlank(canvas)) {
                   try {
                    const ocrText = await ocrImage(canvas.toDataURL(), apiKey);
                    pageText = ocrText;
                   } catch (err) {
                     const message = err instanceof Error ? err.message : String(err);
                     console.error(`OCR failed for page ${i} of ${file.name}:`, message);
                     pageText = ""; // Default to empty string on OCR failure
                     setFileError(`OCR on page ${i} failed: ${message.substring(0,100)}...`);
                   }
                } else {
                  pageText = ""; // Page was blank
                }
              }
              
              allPagesText.push(pageText);

              if (ocrAttemptedOnPage && i < pdf.numPages) {
                setParseProgress(prev => ({ ...prev, current: i, message: `Waiting to avoid rate limits...` }));
                await delay(RATE_LIMIT_DELAY);
              }
            }
            resolve({ content: allPagesText.join('\n\n---\n\n'), aiCallMade: anyAiCallMade });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Error processing PDF:", error);
            reject(`Could not process PDF: ${file.name}. ${message}`);
          }
        };
        reader.onerror = () => reject(`Error reading ${file.name}.`);
        reader.readAsArrayBuffer(file);
      } else {
        reject(`Unsupported file type: ${file.name}. Please use .txt, .md, .pdf, or image files.`);
      }
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!apiKey) {
      setFileError("Please set your Gemini API key in the header before uploading files.");
      return;
    }

    setCombinedContent("");
    setFileError("");
    setIsParsingFile(true);
    setParseProgress({ current: 0, total: 0, message: "Processing files..." });
    const fileList = Array.from(files);
    setFileNames(fileList.map(f => f.name));

    let allContents: string[] = [];
    let anyAiCallMadeInBatch = false;

    try {
      for (const [index, file] of fileList.entries()) {
        const { content, aiCallMade } = await processFile(file);
        allContents.push(content);
        if (aiCallMade) {
          anyAiCallMadeInBatch = true;
        }
        
        if (aiCallMade && index < fileList.length - 1) {
            setParseProgress(prev => ({ ...prev, message: `Waiting to avoid rate limits...` }));
            await delay(RATE_LIMIT_DELAY);
        }
      }
      setCombinedContent(allContents.join("\n\n---\n\n"));
    } catch (error) {
      const message = String(error);
      setFileError(message);
      setFileNames([]);
      setCombinedContent("");
    } finally {
      setIsParsingFile(false);
      setParseProgress({ current: 0, total: 0, message: "" });
    }
  };


  function onSubmit(values: QuizSetupValues) {
    if (!combinedContent) {
      setFileError("Please upload one or more files and wait for them to be processed.");
      return;
    }
    onQuizStart(combinedContent, values);
  }

  const isProcessing = isGenerating || isParsingFile;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 relative h-16 w-16 flex items-center justify-center">
          <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-0" : "opacity-100")}>
            <PulsingCore className="h-16 w-16" />
          </div>
          <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-100" : "opacity-0")}>
            <PulsingCoreRed className="h-16 w-16" />
          </div>
        </div>
        <CardTitle className="font-headline text-4xl">Generate Your Quiz</CardTitle>
        <CardDescription className="text-lg">
          Upload your materials (.txt, .pdf, .md, .png, .jpg) and the AI will create a custom quiz.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Label className="text-lg font-semibold">1. Upload Content</Label>
              <Input id="file-upload" type="file" multiple onChange={handleFileChange} accept=".txt,.pdf,.md,image/*" className="pt-2 file:text-primary file:font-semibold" disabled={isProcessing} />
              {isParsingFile && (
                 <p className="text-sm text-muted-foreground pt-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {parseProgress.message}
                  {parseProgress.total > 1 && ` (${parseProgress.current} of ${parseProgress.total})`}
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

            <div className="space-y-2">
              <Label className="text-lg font-semibold">2. Configure Your Quiz</Label>
              <div className="p-4 border rounded-md space-y-4 bg-background">
                <FormField
                  control={form.control}
                  name="numQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Questions</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={isProcessing}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-4 p-4 bg-destructive/10 rounded-md border border-destructive/20">
                  <PulsingCoreRed className="h-10 w-10 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="hell-bound-mode" className="text-destructive font-bold">HELL BOUND MODE</Label>
                    <p className="text-xs text-destructive/80">Generate an extremely difficult quiz to truly test your knowledge.</p>
                  </div>
                  <Switch
                    id="hell-bound-mode"
                    checked={isHellBound}
                    onCheckedChange={onHellBoundToggle}
                    disabled={isProcessing}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing}>
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
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing}>
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
            <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing}>
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
