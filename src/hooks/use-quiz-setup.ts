
'use client';

import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { ocrImageWithFallback, isCanvasBlank } from '@/lib/ocr';
import type { Quiz, Question, PastQuiz } from '@/lib/types';
import { generateQuiz, GenerateQuizInput } from '@/ai/flows/generate-quiz';
import { generateHellBoundQuiz, GenerateHellBoundQuizInput } from '@/ai/flows/generate-hell-bound-quiz';
import { useTheme } from '@/hooks/use-theme';
import { addFileContent, getFileContent, deleteFileContent, addPastQuiz, getPastQuizById } from '@/lib/indexed-db';

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
  loadQuizFromHistory: (id: number, mode: 'retake' | 'results') => Promise<void>;
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

  const processFile = useCallback(
    (file: File): Promise<{ content: string; source: 'cache' | 'processed' }> => {
      return new Promise(async (resolve, reject) => {
        // Tier 0: Check IndexedDB Cache
        try {
          const cachedFile = await getFileContent(file.name);
          if (cachedFile) {
            resolve({ content: cachedFile.content, source: 'cache' });
            return;
          }
        } catch (e) {
            console.warn("IndexedDB cache check failed, processing file from scratch.", e);
        }

        const doProcess = (
          processor: (file: File) => Promise<{ content: string }>
        ) => {
          processor(file)
            .then(async ({ content }) => {
              await addFileContent({ name: file.name, content });
              resolve({ content, source: 'processed' });
            })
            .catch(reject);
        };

        if (file.type === 'text/plain' || file.type === 'text/markdown') {
          doProcess(f => new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = e => res({ content: e.target?.result as string });
            reader.onerror = () => rej(`Error reading ${f.name}.`);
            reader.readAsText(f);
          }));
        } else if (file.type.startsWith('image/')) {
          doProcess(async f => {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((res, rej) => {
              reader.onload = e => res(e.target?.result as string);
              reader.onerror = () => rej(`Failed to read ${f.name}.`);
              reader.readAsDataURL(f);
            });
            if (!dataUrl) throw new Error(`Failed to read ${f.name}.`);
            try {
              const { text, source } = await ocrImageWithFallback(dataUrl, apiKey, incrementUsage);
              toast({ title: source === 'ai' ? 'Image content extracted with AI!' : 'Image content extracted locally!' });
              return { content: text };
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              throw new Error(`OCR failed for ${f.name}: ${message}`);
            }
          });
        } else if (file.type === 'application/pdf') {
          doProcess(async f => {
            const reader = new FileReader();
            const arrayBuffer = await new Promise<ArrayBuffer>((res, rej) => {
              reader.onload = e => res(e.target?.result as ArrayBuffer);
              reader.onerror = () => rej(`Failed to read ${f.name}.`);
              reader.readAsArrayBuffer(f);
            });
            if (!arrayBuffer) throw new Error(`Failed to read ${f.name}.`);
            
            try {
                const typedarray = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                
                setParseProgress({ current: 0, total: pdf.numPages, message: "Analyzing PDF structure..." });
                
                const pagePromises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1));
                const pages = await Promise.all(pagePromises);
    
                const analysisPromises = pages.map(async (page, i) => {
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ').trim();
                  
                  const isLikelyImage = pageText.length < 100 || pageText.replace(/\s/g, '').length < 50;
                  
                  setParseProgress(prev => ({ ...prev, current: i + 1, message: `Analyzing page ${i + 1}...` }));
    
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
                
                return { content: allPagesText.join('\n\n---\n\n') };
    
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("Error processing PDF:", error);
                throw new Error(`Could not process PDF: ${file.name}. ${message}`);
              }
          });
        } else {
          reject(`Unsupported file type: ${file.name}. Please use .txt, .md, .pdf, or image files.`);
        }
      });
    },
    [apiKey, incrementUsage, toast]
  );

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!apiKey) {
      setFileError("Please set your Gemini API key in the header before uploading files.");
      return;
    }

    const controller = new AbortController();
    setParsingController(controller);

    setFileError("");
    setIsParsing(true);
    setParseProgress({ current: 0, total: files.length, message: "Preparing to process files..." });
    
    const fileList = Array.from(files);
    // Prevent adding duplicates to the list
    const newFiles = fileList.filter(f => !processedFiles.some(pf => pf.name === f.name));
    if(newFiles.length !== fileList.length) {
        toast({ title: "Duplicate files skipped."});
    }

    if (newFiles.length === 0) {
        setIsParsing(false);
        setParseProgress({ current: 0, total: 0, message: "" });
        return;
    }
    
    let allProcessedFiles = [...processedFiles];

    try {
      for (let i = 0; i < newFiles.length; i++) {
        if (controller.signal.aborted) throw new Error("Cancelled");
        
        const file = newFiles[i];
        setParseProgress({ current: i + 1, total: newFiles.length, message: `Processing ${file.name}...` });
        
        const { content, source } = await processFile(file);
        
        if (controller.signal.aborted) throw new Error("Cancelled");

        allProcessedFiles.push({ name: file.name, content });

        if (source === 'cache') {
            toast({ title: "Loaded from cache!", description: `${file.name} was instantly loaded.` });
        }
      }
      
      setProcessedFiles(allProcessedFiles);

    } catch (error) {
        if ((error as Error).message === "Cancelled") {
            // Don't change the file list if cancelled, just stop
        } else {
            const message = String(error);
            setFileError(message);
            toast({ variant: "destructive", title: "File Processing Error", description: message });
        }
    } finally {
      setIsParsing(false);
      setParsingController(null);
      setParseProgress({ current: 0, total: 0, message: "" });
      if (event.target) event.target.value = ''; // Reset file input
    }
  }, [processFile, apiKey, toast, processedFiles]);
  
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
        
        const contentForAI = combinedContent;

        let params: Omit<GenerateQuizInput, 'apiKey'> | Omit<GenerateHellBoundQuizInput, 'apiKey'>;
        if (isHellBound) {
          params = {
            fileContent: contentForAI,
            numQuestions: questionsInBatch,
            existingQuestions: existingQuestionTitles,
          };
        } else {
          params = {
            content: contentForAI,
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

    if (quiz && processedFiles.length > 0) {
      let correctCount = 0;
      const multipleChoiceQuestions = quiz.questions.filter(q => q.questionType === 'multipleChoice');

      multipleChoiceQuestions.forEach(q => {
        const originalIndex = quiz.questions.findIndex(origQ => origQ.question === q.question);
        if (answers[originalIndex] === q.answer) {
          correctCount++;
        }
      });

      const score = {
        score: correctCount,
        total: multipleChoiceQuestions.length,
        percentage: multipleChoiceQuestions.length > 0 ? Math.round((correctCount / multipleChoiceQuestions.length) * 100) : 0,
      };

      const quizTitle = processedFiles.map(f => f.name).join(', ').substring(0, 100);
      const pastQuiz: PastQuiz = {
        id: Date.now(),
        title: quizTitle || "Quiz",
        date: new Date().toISOString(),
        quiz,
        userAnswers: answers,
        score,
      };

      addPastQuiz(pastQuiz).then(() => {
        toast({ title: "Quiz results saved to your history." });
      }).catch(err => {
        console.error("Failed to save quiz history", err);
        toast({ variant: "destructive", title: "Could not save quiz history." });
      });
    }
  }, [quiz, processedFiles, toast]);

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
  
  const loadQuizFromHistory = useCallback(async (id: number, mode: 'retake' | 'results') => {
    try {
      const pastQuiz = await getPastQuizById(id);
      if (pastQuiz) {
        setQuiz(pastQuiz.quiz);
        setTimer(0); // Timers aren't saved
        if (mode === 'results') {
          setUserAnswers(pastQuiz.userAnswers);
          setView('results');
        } else {
          setUserAnswers({});
          setView('quiz');
        }
      } else {
        toast({ variant: "destructive", title: "History Not Found", description: "Could not find the specified quiz in your history." });
      }
    } catch(e) {
      toast({ variant: "destructive", title: "Load Error", description: "Failed to load quiz from history." });
    }
  }, [toast]);

  const removeFile = useCallback(async (fileNameToRemove: string) => {
    setProcessedFiles(prev => prev.filter(file => file.name !== fileNameToRemove));
    try {
        await deleteFileContent(fileNameToRemove);
        toast({ title: "File removed", description: `${fileNameToRemove} has been removed from your browser cache.` });
    } catch(e) {
        console.error("Failed to remove file from cache", e);
        toast({ variant: "destructive", title: "Cache Error", description: "Could not remove file from cache." });
    }
  }, [toast]);

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
    loadQuizFromHistory,
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
