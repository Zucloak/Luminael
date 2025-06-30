
'use client';

import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { ocrImageWithFallback, isCanvasBlank } from '@/lib/ocr';
import type { Quiz, Question } from '@/lib/types';
import { generateQuiz, GenerateQuizInput } from '@/ai/flows/generate-quiz';
import { generateHellBoundQuiz, GenerateHellBoundQuizInput } from '@/ai/flows/generate-hell-bound-quiz';
import { useTheme } from '@/hooks/use-theme';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.mjs`;

interface ParseProgress {
  current: number;
  total: number;
  message: string;
}

type View = 'setup' | 'generating' | 'quiz' | 'results';

interface ProcessedFile {
    name: string;
    content: string;
}

interface QuizSetupContextType {
  // File processing state
  processedFiles: ProcessedFile[];
  fileError: string;
  isParsing: boolean;
  parseProgress: ParseProgress;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeFile: (fileName: string) => void;
  stopParsing: () => void;
  
  // Quiz lifecycle state
  view: View;
  quiz: Quiz | null;
  userAnswers: Record<number, string>;
  generationProgress: ParseProgress;
  timer: number;
  isGenerating: boolean;

  // Lifecycle functions
  startQuiz: (values: any) => Promise<void>;
  submitQuiz: (answers: Record<number, string>) => void;
  restartQuiz: () => void;
  retakeQuiz: () => void;
  clearQuizSetup: () => void;
  cancelGeneration: () => void;
}

const QuizSetupContext = createContext<QuizSetupContextType | undefined>(undefined);

export function QuizSetupProvider({ children }: { children: ReactNode }) {
  // File processing state
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [fileError, setFileError] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress>({ current: 0, total: 0, message: '' });
  const [parsingController, setParsingController] = useState<AbortController | null>(null);

  // Quiz lifecycle state
  const [view, setView] = useState<View>('setup');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [generationProgress, setGenerationProgress] = useState<ParseProgress>({ current: 0, total: 0, message: '' });
  const [timer, setTimer] = useState<number>(0);
  const [isGeneratingState, setIsGeneratingState] = useState<boolean>(false);
  const [generationController, setGenerationController] = useState<AbortController | null>(null);

  const { apiKey, incrementUsage } = useApiKey();
  const { toast } = useToast();
  const { isHellBound } = useTheme();

  const processFile = useCallback((file: File): Promise<{ content: string }> => {
    return new Promise(async (resolve, reject) => {
      if (file.type === "text/plain" || file.type === "text/markdown") {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ content: e.target?.result as string });
        reader.onerror = () => reject(`Error reading ${file.name}.`);
        reader.readAsText(file);
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(`Failed to read ${file.name}.`);
            const imageDataUrl = e.target.result as string;
            try {
                const { text, source } = await ocrImageWithFallback(imageDataUrl, apiKey, incrementUsage);
                toast({
                    title: source === 'ai' ? "Image content extracted with AI!" : "Image content extracted locally!",
                });
                resolve({ content: text });
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
            
            setParseProgress({ current: 0, total: pdf.numPages, message: "Analyzing PDF structure..." });
            
            const pagePromises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1));
            const pages = await Promise.all(pagePromises);

            const analysisPromises = pages.map(async (page, i) => {
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ').trim();
              
              const isLikelyImage = pageText.length < 100 || pageText.replace(/\s/g, '').length < 50;
              
              setParseProgress(prev => ({ ...prev, current: prev.current + 1, message: `Analyzing page ${i + 1}...` }));

              return {
                pageNum: i + 1,
                text: isLikelyImage ? null : pageText,
                needsOcr: isLikelyImage,
                page: page,
              };
            });
            
            const initialPageData = await Promise.all(analysisPromises);
            setParseProgress({ current: pdf.numPages, total: pdf.numPages, message: "Analysis complete." });

            const pagesToOcr = initialPageData.filter(p => p.needsOcr);
            const allPagesText = initialPageData.filter(p => !p.needsOcr).map(p => p.text as string);
            
            if (pagesToOcr.length > 0) {
                const ocrProcessor = async (pageData: (typeof pagesToOcr)[0]): Promise<string> => {
                    const page = pageData.page;
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) return `[Canvas Error on page ${pageData.pageNum}]`;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = { canvasContext: context, viewport: viewport };
                    await page.render(renderContext).promise;

                    if (isCanvasBlank(canvas)) return '';
                    
                    try {
                       const { text } = await ocrImageWithFallback(canvas.toDataURL(), apiKey, incrementUsage);
                       return text;
                    } catch (err) {
                       const message = err instanceof Error ? err.message : String(err);
                       console.error(`OCR failed for page ${pageData.pageNum} of ${file.name}:`, message);
                       return `[OCR Error on page ${pageData.pageNum}: ${message.substring(0, 100)}...]`;
                    }
                };
                
                const BATCH_SIZE = 2;
                const BATCH_DELAY = 4000;

                let processedCount = 0;
                for (let i = 0; i < pagesToOcr.length; i += BATCH_SIZE) {
                    const batch = pagesToOcr.slice(i, i + BATCH_SIZE);
                    const batchNum = i / BATCH_SIZE + 1;
                    const totalBatches = Math.ceil(pagesToOcr.length / BATCH_SIZE);

                    setParseProgress({
                        current: processedCount,
                        total: pagesToOcr.length,
                        message: `Processing OCR batch ${batchNum} of ${totalBatches}...`
                    });

                    const batchPromises = batch.map(ocrProcessor);
                    const batchResults = await Promise.all(batchPromises);
                    allPagesText.push(...batchResults);
                    
                    processedCount += batch.length;

                    if (i + BATCH_SIZE < pagesToOcr.length) {
                         setParseProgress({
                            current: processedCount,
                            total: pagesToOcr.length,
                            message: `Waiting to avoid rate limits...`
                        });
                        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                    }
                }
            }
            
            resolve({ content: allPagesText.join('\n\n---\n\n') });

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
  }, [apiKey, incrementUsage, toast]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!apiKey) {
      setFileError("Please set your Gemini API key in the header before uploading files.");
      return;
    }

    const controller = new AbortController();
    setParsingController(controller);

    setProcessedFiles([]);
    setFileError("");
    setIsParsing(true);
    setParseProgress({ current: 0, total: files.length, message: "Preparing to process files..." });
    const fileList = Array.from(files);
    let allProcessedFiles: ProcessedFile[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        if (controller.signal.aborted) {
          throw new Error("Cancelled");
        }
        const file = fileList[i];
        setParseProgress({ current: i + 1, total: fileList.length, message: `Processing ${file.name}...` });
        const { content } = await processFile(file);
        allProcessedFiles.push({ name: file.name, content });

        if (controller.signal.aborted) {
          throw new Error("Cancelled");
        }
      }
      
      setProcessedFiles(allProcessedFiles);
      if (allProcessedFiles.length > 0) {
        toast({ title: "File processing complete!", description: "Your content is ready." });
      }
    } catch (error) {
        if ((error as Error).message === "Cancelled") {
            setProcessedFiles([]);
        } else {
            const message = String(error);
            setFileError(message);
            setProcessedFiles([]);
            toast({ variant: "destructive", title: "File Processing Error", description: message });
        }
    } finally {
      setIsParsing(false);
      setParsingController(null);
      setParseProgress({ current: 0, total: 0, message: "" });
    }
  }, [processFile, apiKey, toast]);
  
  const startQuiz = useCallback(async (values: any) => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please set your Gemini API key in the header before generating a quiz.",
      });
      return;
    }
    const combinedContent = processedFiles.map(f => f.content).join('\n\n---\n\n');
    if (!combinedContent) {
        toast({
            variant: "destructive",
            title: "Content Missing",
            description: "Please upload content before starting a quiz.",
        });
        return;
    }

    if (combinedContent.length > 20000) {
      incrementUsage();
    }

    const controller = new AbortController();
    setGenerationController(controller);
    
    const BATCH_SIZE = 5;
    const totalQuestions = values.numQuestions;
    
    setTimer(values.timerEnabled ? values.timerPerQuestion || 0 : 0);
    setView('generating');
    setIsGeneratingState(true);
    setGenerationProgress({ current: 0, total: totalQuestions, message: '' });

    let allQuestions: Question[] = [];
    let existingQuestionTitles: string[] = [];

    try {
      for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
        if (controller.signal.aborted) {
            throw new Error("Cancelled");
        }

        const questionsInBatch = Math.min(BATCH_SIZE, totalQuestions - i);
        setGenerationProgress(prev => ({ ...prev, current: i, message: `Generating question batch ${Math.floor(i/BATCH_SIZE) + 1}...` }));

        const generatorFn = isHellBound ? generateHellBoundQuiz : generateQuiz;
        
        let params: Omit<GenerateQuizInput, 'apiKey'> | Omit<GenerateHellBoundQuizInput, 'apiKey'>;
        if (isHellBound) {
          params = {
            fileContent: combinedContent,
            numQuestions: questionsInBatch,
            existingQuestions: existingQuestionTitles,
          };
        } else {
          params = {
            content: combinedContent,
            numQuestions: questionsInBatch,
            difficulty: values.difficulty || 'Medium',
            questionFormat: values.questionFormat || 'multipleChoice',
            existingQuestions: existingQuestionTitles,
          };
        }
        
        const result = await (generatorFn as any)({...params, apiKey});
        incrementUsage();

        if (result && result.quiz && Array.isArray(result.quiz.questions)) {
          const newQuestions = result.quiz.questions.filter(q => q && q.question && q.question.trim() !== '');
          allQuestions = [...allQuestions, ...newQuestions];
          existingQuestionTitles = [...existingQuestionTitles, ...newQuestions.map(q => q.question)];
          setGenerationProgress(prev => ({ ...prev, current: allQuestions.length }));
        } else {
            console.warn(`AI returned an invalid response or no questions in batch starting at ${i}.`);
        }
      }

      if (controller.signal.aborted) {
        throw new Error("Cancelled");
      }

      if (allQuestions.length === 0) {
        throw new Error("The AI failed to generate any valid questions. Please check your content or settings and try again.");
      }
      
      if (allQuestions.length < totalQuestions) {
        toast({
            title: "Quiz Adjusted",
            description: `The AI generated ${allQuestions.length} valid questions instead of the requested ${totalQuestions}.`,
        });
      }

      setQuiz({ questions: allQuestions });
      setUserAnswers({});
      setView('quiz');

    } catch (error) {
      if ((error as Error).message === 'Cancelled') {
        return; // Handled by cancelGeneration
      }
      console.error(error);
      const message = error instanceof Error ? error.message : "Something went wrong. The AI might be busy, or the content was unsuitable. Please try again.";
      toast({
        variant: "destructive",
        title: "Error Generating Quiz",
        description: message,
      });
      setView('setup');
    } finally {
      setIsGeneratingState(false);
      setGenerationController(null);
      setGenerationProgress({ current: 0, total: 0, message: '' });
    }
  }, [apiKey, toast, processedFiles, isHellBound, incrementUsage]);

  const submitQuiz = useCallback((answers: Record<number, string>) => {
    setUserAnswers(answers);
    setView('results');
  }, []);

  const clearQuizSetup = useCallback(() => {
    setProcessedFiles([]);
    setFileError('');
    setIsParsing(false);
    setParseProgress({ current: 0, total: 0, message: '' });
  }, []);

  const restartQuiz = useCallback(() => {
    clearQuizSetup();
    setQuiz(null);
    setUserAnswers({});
    setTimer(0);
    setView('setup');
  }, [clearQuizSetup]);

  const retakeQuiz = useCallback(() => {
    setUserAnswers({});
    setView('quiz');
  }, []);

  const removeFile = useCallback((fileNameToRemove: string) => {
    setProcessedFiles(prev => prev.filter(file => file.name !== fileNameToRemove));
  }, []);

  const stopParsing = useCallback(() => {
    parsingController?.abort();
    setIsParsing(false);
    setParseProgress({ current: 0, total: 0, message: '' });
    toast({ title: "File processing cancelled." });
  }, [parsingController, toast]);

  const cancelGeneration = useCallback(() => {
    generationController?.abort();
    setIsGeneratingState(false);
    setView('setup');
    toast({ title: "Quiz generation cancelled." });
  }, [generationController, toast]);


  const value = {
    processedFiles,
    fileError,
    isParsing,
    parseProgress,
    handleFileChange,
    removeFile,
    stopParsing,
    
    view,
    quiz,
    userAnswers,
    generationProgress,
    timer,
    isGenerating: isGeneratingState || isParsing,

    startQuiz,
    submitQuiz,
    restartQuiz,
    retakeQuiz,
    clearQuizSetup,
    cancelGeneration,
  };

  return React.createElement(QuizSetupContext.Provider, { value }, children);
}

export function useQuizSetup() {
  const context = useContext(QuizSetupContext);
  if (context === undefined) {
    throw new Error('useQuizSetup must be used within a QuizSetupProvider');
  }
  return context;
}
