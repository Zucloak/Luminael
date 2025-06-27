"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { FileText, BrainCircuit, Sparkles, Wand2, Loader2 } from "lucide-react";
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
import { extractTextFromImage } from '@/ai/flows/extractTextFromImage';

// Use a stable CDN and hardcode the version to match package.json to avoid version mismatch issues.
// Use the .mjs build for compatibility with modern bundlers and to avoid "dynamically imported module" errors.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.mjs`;

async function ocrImage(imageDataUrl: string): Promise<string> {
  const response = await fetch('/api/extract-text-from-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to extract text from image: ${errorData.details || response.statusText}`);
  }
  const data = await response.json();
  return data.extractedText;
}

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d');
  if (!context) return true; // Should not happen, but good practice

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  // A canvas is considered blank if all its pixels are white (0xFFFFFFFF) or fully transparent (0x00000000)
  return !pixelBuffer.some(color => color !== 0xFFFFFFFF && color !== 0);
}


const quizSetupSchema = z.object({
  numQuestions: z.coerce.number().min(1, "Must have at least 1 question.").max(100, "Maximum 100 questions."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  questionFormat: z.enum(["multipleChoice", "openEnded", "mixed"]).default("multipleChoice"),
});

type QuizSetupValues = z.infer<typeof quizSetupSchema>;

interface QuizSetupProps {
  onQuizStart: (fileContent: string, values: QuizSetupValues, isHellBound: boolean) => Promise<void>;
  isGenerating: boolean;
}

export function QuizSetup({ onQuizStart, isGenerating }: QuizSetupProps) {
  const [combinedContent, setCombinedContent] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isHellBound, setIsHellBound] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0, processing: false });

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 10,
      difficulty: "Medium",
      questionFormat: "multipleChoice",
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setCombinedContent("");
    setFileError("");
    setIsParsingFile(true);
    const fileList = Array.from(files);
    setFileNames(fileList.map(f => f.name));

    const readPromises = fileList.map(file => {
      return new Promise<string>(async (resolve, reject) => {
        if (file.type === "text/plain" || file.type === "text/markdown") {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(`Error reading ${file.name}.`);
          reader.readAsText(file);
        } else if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const text = await ocrImage(e.target?.result as string);
              resolve(text);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              reject(`Failed OCR on ${file.name}: ${message}`);
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
              
              // First, try text extraction
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
              }
              
              // If text is minimal, fallback to OCR
              if (fullText.trim().length < 100 * pdf.numPages) { // Heuristic to detect image-based PDF
                fullText = '';
                setOcrProgress({ current: 0, total: pdf.numPages, processing: true });
                for (let i = 1; i <= pdf.numPages; i++) {
                  setOcrProgress(prev => ({ ...prev, current: i }));
                  const page = await pdf.getPage(i);
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

                  if (isCanvasBlank(canvas)) {
                    continue; // Skip blank pages
                  }

                  const pageText = await ocrImage(canvas.toDataURL());
                  fullText += pageText + '\n\n';
                }
              }
              resolve(fullText);
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
    });

    try {
      const contents = await Promise.all(readPromises);
      setCombinedContent(contents.join("\n\n---\n\n"));
      setFileError("");
    } catch (error) {
      const message = String(error);
      setFileError(message);
      setFileNames([]);
      setCombinedContent("");
    } finally {
      setIsParsingFile(false);
      setOcrProgress({ current: 0, total: 0, processing: false });
    }
  };

  function onSubmit(values: QuizSetupValues) {
    if (!combinedContent) {
      setFileError("Please upload one or more files and wait for them to be processed.");
      return;
    }
    onQuizStart(combinedContent, values, isHellBound);
  }

  const isProcessing = isGenerating || isParsingFile;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <BrainCircuit className="h-10 w-10 text-primary" />
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
                  {ocrProgress.processing 
                    ? `Performing OCR on PDF... Page ${ocrProgress.current} of ${ocrProgress.total}`
                    : "Processing files..."
                  }
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
