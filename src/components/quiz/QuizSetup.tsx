
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { FileText, Sparkles, Loader2, AlertTriangle, Timer } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  numQuestions: z.coerce.number().min(1, "Must be at least 1 question.").max(100, "Maximum 100 questions."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  questionFormat: z.enum(["multipleChoice", "openEnded", "mixed"]).default("multipleChoice"),
  timerEnabled: z.boolean().default(false),
  timerPerQuestion: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nonnegative("Timer must be a positive number.").optional()
  )
}).refine(data => {
  if (data.timerEnabled) {
    return data.timerPerQuestion !== undefined && data.timerPerQuestion > 0;
  }
  return true;
}, {
  message: "Please set a time greater than 0.",
  path: ["timerPerQuestion"],
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
  const [isClient, setIsClient] = useState(false);
  const { apiKey, loading: apiKeyLoading } = useApiKey();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 10,
      difficulty: "Medium",
      questionFormat: "multipleChoice",
      timerEnabled: false,
      timerPerQuestion: undefined
    },
  });

  const timerEnabled = form.watch("timerEnabled");

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
                setParseProgress(prev => ({ ...prev, current: i, message: `Page ${i} is image-based, using AI OCR...` }))
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
                setParseProgress(prev => ({ ...prev, message: `Waiting to avoid rate limits...` }))
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
    if (!apiKey) {
      setFileError("Please set your Gemini API key before starting the quiz.");
      return;
    }
    onQuizStart(combinedContent, values);
  }

  const isApiKeyMissing = !apiKey;
  const isProcessing = isGenerating || isParsingFile;

  if (!isClient) {
    return (
       <Card className="w-full max-w-3xl mx-auto animate-in fade-in-50 duration-500">
          <CardHeader className="text-center items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-48 mt-4" />
            <Skeleton className="h-4 w-64 mt-2" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="p-4 border rounded-md space-y-4 bg-background/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-12 w-full" />
          </CardFooter>
        </Card>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {isHellBound && (
        <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 opacity-60 animate-supercharged-border bg-[length:400%_400%]" />
      )}
      <Card className={cn(
        "w-full relative animate-in fade-in-50 duration-500",
        isHellBound ? "bg-card/80 backdrop-blur-sm border-0" : "shadow-2xl"
      )}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative h-16 w-16 flex items-center justify-center">
            <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-0" : "opacity-100")}>
              <PulsingCore className="h-16 w-16" />
            </div>
            <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-100" : "opacity-0")}>
              <PulsingCoreRed className="h-16 w-16" />
            </div>
          </div>
          <CardTitle className="font-headline text-4xl">Luminael AI</CardTitle>
          <CardDescription className="text-sm text-muted-foreground italic px-4">
              {isHellBound 
                ? "You seek a true trial. Let's forge your knowledge in fire."
                : "Ignite your potential. Master any subject."
              }
          </CardDescription>
          <CardDescription className="pt-2">
            Upload your materials (.txt, .pdf, .md, .png, .jpg) and the AI will create a custom quiz.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-2">
                <Label className="text-lg font-semibold">1. Upload Content</Label>
                {isApiKeyMissing && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">Please set your Gemini API key in the header to enable file uploads. An indicator will appear on the key icon.</span>
                  </div>
                )}
                <Input id="file-upload" type="file" multiple onChange={handleFileChange} accept=".txt,.pdf,.md,image/*" className="pt-2 file:text-primary file:font-semibold" disabled={isProcessing || isApiKeyMissing || apiKeyLoading} />
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
                <div className="p-4 border rounded-md space-y-4 bg-background/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
                    <FormField
                      control={form.control}
                      name="numQuestions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="h-6">Number of Questions</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (Number(value) > 100) {
                                        field.onChange(100);
                                    } else if (Number(value) < 1 && value !== '') {
                                        field.onChange(1);
                                    }
                                    else {
                                        field.onChange(value);
                                    }
                                }}
                                max="100"
                                className="pr-16"
                                disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                              />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3 hover:bg-muted/50"
                                onClick={() => form.setValue('numQuestions', 100, { shouldValidate: true })}
                                disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                            >
                                Max
                            </Button>
                          </div>
                          {isClient && <FormMessage />}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timerPerQuestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            htmlFor="timer-input"
                            className="flex items-center gap-1.5 h-6"
                          >
                            <Timer className="h-4 w-4" />
                            Timer per Question (sec)
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                id="timer-input"
                                type="number"
                                placeholder="e.g. 30"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : +e.target.value
                                  )
                                }
                                value={field.value ?? ""}
                                min="0"
                                disabled={
                                  !timerEnabled ||
                                  isProcessing ||
                                  isApiKeyMissing ||
                                  apiKeyLoading
                                }
                                className={cn(!timerEnabled && "bg-muted/50")}
                              />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name="timerEnabled"
                              render={({ field: switchField }) => (
                                <FormControl>
                                  <Switch
                                    checked={switchField.value}
                                    onCheckedChange={switchField.onChange}
                                    disabled={
                                      isProcessing ||
                                      isApiKeyMissing ||
                                      apiKeyLoading
                                    }
                                    aria-controls="timer-input"
                                  />
                                </FormControl>
                              )}
                            />
                          </div>
                          {isClient && <FormMessage />}
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className={cn(
                    "flex items-center space-x-4 p-4 rounded-md",
                    "bg-gradient-to-r from-amber-400 via-red-500 to-yellow-500",
                    "animate-supercharged-border bg-[length:400%_400%]"
                  )}>
                    <PulsingCoreRed className="h-10 w-10 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="hell-bound-mode" className="font-bold text-destructive-foreground">HELL BOUND MODE</Label>
                      <p className="text-xs text-destructive-foreground/80">Generate an extremely difficult quiz to truly test your knowledge.</p>
                    </div>
                    <Switch
                      id="hell-bound-mode"
                      checked={isHellBound}
                      onCheckedChange={onHellBoundToggle}
                      disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
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
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing || isApiKeyMissing || apiKeyLoading}>
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
                            {isClient && <FormMessage />}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing || isApiKeyMissing || apiKeyLoading}>
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
                            {isClient && <FormMessage />}
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing || !combinedContent || isApiKeyMissing || apiKeyLoading}>
                {isApiKeyMissing && !apiKeyLoading ? (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    API Key Required
                  </>
                ) : isGenerating ? (
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
    </div>
  );
}
