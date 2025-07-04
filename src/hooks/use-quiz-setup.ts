'use client';

import React, { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { ocrImageWithFallback, isCanvasBlank } from '@/lib/ocr';
import type { Quiz, Question, GenerateQuizInput, GenerateHellBoundQuizInput } from '@/lib/types';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { generateHellBoundQuiz } from '@/ai/flows/generate-hell-bound-quiz';
import { extractKeyConcepts } from '@/ai/flows/extract-key-concepts';
import { useTheme } from '@/hooks/use-theme';
import { getPastQuizById } from '@/lib/indexed-db';
import { analyzeContentForLaTeX } from '@/ai/flows/analyzeForLaTeX';

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
  isAnalyzingContent: boolean;
  canGenerateCalculative: boolean | null;

  // Quiz lifecycle state
  view: View;
  quiz: Quiz | null;
  userAnswers: Record<number, string>;
  generationProgress: ParseProgress;
  timer: number;
  isGenerating: boolean;

  // Eco Mode
  isEcoModeActive: boolean;
  toggleEcoMode: () => void;

  // Lifecycle functions
  startQuiz: (values: any) => Promise<void>;
  submitQuiz: (answers: Record<number, string>) => void;
  restartQuiz: () => void;
  retakeQuiz: () => void;
  clearQuizSetup: () => void;
  cancelGeneration: () => void;
  loadQuizFromHistory: (id: number, mode: 'retake' | 'results' | 'resume') => Promise<void>;
}

const QuizSetupContext = createContext<QuizSetupContextType | undefined>(undefined);

export function QuizSetupProvider({ children }: { children: React.ReactNode }) {
  // File processing state
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [fileError, setFileError] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress>({ current: 0, total: 0, message: '' });
  const [parsingController, setParsingController] = useState<AbortController | null>(null);
  const [isAnalyzingContent, setIsAnalyzingContent] = useState<boolean>(false);
  const [canGenerateCalculative, setCanGenerateCalculative] = useState<boolean | null>(null);

  // Quiz lifecycle state
  const [view, setView] = useState<View>('setup');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [generationProgress, setGenerationProgress] = useState<ParseProgress>({ current: 0, total: 0, message: '' });
  const [timer, setTimer] = useState<number>(0);
  const [isGeneratingState, setIsGeneratingState] = useState<boolean>(false);
  const [generationController, setGenerationController] = useState<AbortController | null>(null);

  // Eco Mode state
  const [isEcoModeActive, setIsEcoModeActive] = useState<boolean>(false);

  const { apiKey, incrementUsage } = useApiKey();
  const { toast } = useToast();
  const { isHellBound } = useTheme();

  const performLatexAnalysis = useCallback(async (currentFiles: ProcessedFile[]) => {
    if (!apiKey) {
      setCanGenerateCalculative(true);
      return;
    }
    if (currentFiles.length > 0) {
      const combinedContent = currentFiles.map(f => f.content).join("\n\n");
      if (combinedContent.trim()) {
        setIsAnalyzingContent(true);
        setCanGenerateCalculative(null);
        try {
          const analysisResult = await analyzeContentForLaTeX({ content: combinedContent, apiKey });
          incrementUsage();
          setCanGenerateCalculative(analysisResult.hasLaTeXContent);
          if (!analysisResult.hasLaTeXContent) {
            toast({
              title: "Content Analysis",
              description: "No mathematical expressions suitable for 'Problem Solving (Calculative)' questions were detected.",
              duration: 7000,
            });
          }
        } catch (err) {
          console.error("Error analyzing content for LaTeX:", err);
          toast({
            variant: "destructive",
            title: "Content Analysis Failed",
            description: "Could not determine if content is suitable for calculative questions.",
          });
          setCanGenerateCalculative(true);
        } finally {
          setIsAnalyzingContent(false);
        }
      } else {
        setCanGenerateCalculative(false);
      }
    } else {
      setCanGenerateCalculative(null);
    }
  }, [apiKey, toast, incrementUsage]);

  useEffect(() => {
    performLatexAnalysis(processedFiles);
  }, [processedFiles, performLatexAnalysis]);


  const processFile = useCallback(
    (file: File): Promise<{ content: string }> => {
      return new Promise(async (resolve, reject) => {
        const doProcess = (
          processor: (file: File) => Promise<{ content: string }>
        ) => {
          processor(file)
            .then(async ({ content }) => {
              resolve({ content });
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
              const { text, source, confidence } = await ocrImageWithFallback(dataUrl, apiKey, incrementUsage, isEcoModeActive);
              // Toast will be handled by the caller based on confidence if needed (for Eco Mode)
              if (!isEcoModeActive) { // Only toast non-Eco mode successes immediately
                  toast({ title: source === 'ai' ? 'Image content extracted with AI!' : 'Image content extracted locally!' });
              }
              // Return content and confidence for potential UI feedback in Eco Mode
              return { content: text, confidence, source };
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
                    setParseProgress({
                        current: 0,
                        total: pagesToOcr.length,
                        message: `Starting AI OCR for ${pagesToOcr.length} PDF pages...`
                    });
                    const ocrPromises = pagesToOcr.map(async (pageData, idx) => {
                        const page = pageData.page;
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) return `[Canvas Error on page ${pageData.pageNum}]`;
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        const renderContext = { canvasContext: context, viewport: viewport };
                        await page.render(renderContext).promise;
                        if (isCanvasBlank(canvas)) {
                            setParseProgress(prev => ({ ...prev, current: prev.current + 1, message: `Page ${pageData.pageNum} is blank, skipping OCR.` }));
                            return '';
                        }
                        try {
                            // Pass isEcoModeActive to ocrImageWithFallback for PDF pages
                            const { text, confidence, source } = await ocrImageWithFallback(canvas.toDataURL(), apiKey, incrementUsage, isEcoModeActive);
                            if (isEcoModeActive && (confidence === undefined || confidence < 50)) { // Example threshold
                               toast({
                                   title: `Local OCR for PDF page ${pageData.pageNum} may be incomplete`,
                                   description: "Consider turning off ECO mode for better results on image-heavy PDFs.",
                                   duration: 7000,
                               });
                            } else if (!isEcoModeActive && source === 'ai') {
                                toast({ title: `AI OCR for PDF page ${pageData.pageNum} complete.`});
                            }
                            // No specific toast for successful local OCR in non-eco mode here, as it's part of a batch.
                            // The main ocrImageWithFallback handles its own toasts for single images.
                            setParseProgress(prev => ({ ...prev, current: prev.current + 1, message: `${source === 'ai' ? 'AI' : 'Local'} OCR for page ${pageData.pageNum} complete.` }));
                           return text;
                        } catch (err) {
                           const message = err instanceof Error ? err.message : String(err);
                           console.error(`OCR failed for page ${pageData.pageNum} of ${file.name}:`, message);
                           setParseProgress(prev => ({ ...prev, current: prev.current + 1, message: `AI OCR failed for page ${pageData.pageNum}.` }));
                           return `[OCR Error on page ${pageData.pageNum}: ${message.substring(0, 100)}...]`;
                        }
                    });
                    const ocrResults = await Promise.all(ocrPromises);
                    allPagesText.push(...ocrResults);
                    toast({
                      title: 'AI OCR Complete',
                      description: `Successfully processed ${pagesToOcr.length} image-based pages.`,
                    });
                }
                return { content: allPagesText.join('\n\n---\n\n') };
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("Error processing PDF:", error);
                throw new Error(`Could not process PDF: ${file.name}. ${message}`);
              }
          });
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          doProcess(async f => {
            const reader = new FileReader();
            const arrayBuffer = await new Promise<ArrayBuffer>((res, rej) => {
              reader.onload = e => res(e.target?.result as ArrayBuffer);
              reader.onerror = () => rej(`Failed to read ${f.name}.`);
              reader.readAsArrayBuffer(f);
            });
            if (!arrayBuffer) throw new Error(`Failed to read ${f.name}.`);
            try {
              const { value } = await mammoth.extractRawText({ arrayBuffer });
              return { content: value };
            } catch (error) {
              console.error("Error processing .docx file:", error);
              throw new Error(`Could not process Word document: ${f.name}. The file might be corrupted or in an unsupported format.`);
            }
          });
        } else {
          reject(`Unsupported file type: ${file.name}. Please use .txt, .md, .pdf, .docx, or image files.`);
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
    const newFiles = fileList.filter(f => !processedFiles.some(pf => pf.name === f.name));
    if(newFiles.length !== fileList.length) {
        toast({ title: "Duplicate files skipped."});
    }
    if (newFiles.length === 0) {
        setIsParsing(false);
        setParseProgress({ current: 0, total: 0, message: "" });
        return;
    }
    let currentProcessedFiles = [...processedFiles];
    try {
      for (let i = 0; i < newFiles.length; i++) {
        if (controller.signal.aborted) throw new Error("Cancelled");
        const file = newFiles[i];
        setParseProgress({ current: i + 1, total: newFiles.length, message: `Processing ${file.name}...` });
        // processFile now returns { content, confidence, source } for images/PDFs
        const processedResult = await processFile(file);
        if (controller.signal.aborted) throw new Error("Cancelled");

        currentProcessedFiles.push({ name: file.name, content: processedResult.content });

        // Handle Eco Mode OCR feedback for single image files (PDF pages are handled inside processFile)
        if (isEcoModeActive && file.type.startsWith('image/') && (processedResult.confidence === undefined || processedResult.confidence < 50)) { // Example threshold
            toast({
                title: `Local OCR for ${file.name} may be incomplete (Confidence: ${processedResult.confidence?.toFixed(0) ?? 'N/A'}%)`,
                description: "For potentially better results, consider turning off ECO mode and reprocessing the file.",
                duration: 7000, // Longer duration for this important feedback
            });
        } else if (!isEcoModeActive && file.type.startsWith('image/') && processedResult.source === 'ai') {
             // Toast for successful AI OCR in non-eco mode was already in processFile, keep it there.
        } else if (file.type.startsWith('image/') && processedResult.source === 'local' && processedResult.confidence && processedResult.confidence >= 50) {
            toast({ title: `Local OCR for ${file.name} complete.`});
        }


      }
      setProcessedFiles(currentProcessedFiles);
    } catch (error) {
        if ((error as Error).message === "Cancelled") { /* no state change */ } else {
            const message = String(error);
            setFileError(message);
            toast({ variant: "destructive", title: "File Processing Error", description: message });
        }
    } finally {
      setIsParsing(false);
      setParsingController(null);
      setParseProgress({ current: 0, total: 0, message: "" });
      if (event.target) event.target.value = '';
    }
  }, [processFile, apiKey, toast, processedFiles]);
  
  const startQuiz = useCallback(async (values: any) => {
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Required", description: "Please set your Gemini API key." });
      return;
    }
    if (processedFiles.length === 0) {
        toast({ variant: "destructive", title: "Content Missing", description: "Please upload content." });
        return;
    }

    const controller = new AbortController();
    setGenerationController(controller);
    
    const BATCH_SIZE = 5;
    const totalQuestions = values.numQuestions;
    
    setTimer(values.timerEnabled ? values.timerPerQuestion || 0 : 0);
    setView('generating');
    setIsGeneratingState(true);
    setGenerationProgress({ current: 0, total: totalQuestions, message: '' });

    // Removed problemImagePayload logic as it's no longer part of this feature's setup phase

    try {
      setGenerationProgress(prev => ({ ...prev, total: totalQuestions, message: "Synthesizing key concepts..." }));
      const keyConceptsContext = await extractKeyConcepts({ files: processedFiles, apiKey });
      incrementUsage();

      if (controller.signal.aborted) throw new Error("Cancelled");

      let allQuestions: Question[] = [];
      let existingQuestionTitles: string[] = [];

      for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
        if (controller.signal.aborted) throw new Error("Cancelled");
        const questionsInBatch = Math.min(BATCH_SIZE, totalQuestions - i);
        setGenerationProgress(prev => ({ ...prev, current: i, message: `Generating question batch ${Math.floor(i/BATCH_SIZE) + 1}...` }));

        const generatorFn = isHellBound ? generateHellBoundQuiz : generateQuiz;
        
        let params: Partial<GenerateQuizInput | GenerateHellBoundQuizInput> = {};

        if (isHellBound) {
          params = {
            context: keyConceptsContext,
            numQuestions: questionsInBatch,
            existingQuestions: existingQuestionTitles,
          };
        } else {
          params = {
            context: keyConceptsContext,
            numQuestions: questionsInBatch,
            difficulty: values.difficulty || 'Medium',
            questionFormat: values.questionFormat || 'multipleChoice',
            existingQuestions: existingQuestionTitles,
            // problemSpecificOcrText is now added directly if available and format is problemSolving
            ...(values.questionFormat === "problemSolving" && values.problemSpecificOcrText && { problemSpecificOcrText: values.problemSpecificOcrText } ),
          };
        }
        
        const result = await (generatorFn as any)({...params, apiKey});
        incrementUsage();

        if (result && (result as any).rawAiOutputForDebugging) {
          console.log("RAW AI OUTPUT (Questions only, before filtering - from use-quiz-setup):", JSON.stringify((result as any).rawAiOutputForDebugging, null, 2));
        }
        if (result && result.quiz && result.quiz.questions) {
          console.log("FINAL Quiz Questions (After potential filtering - from use-quiz-setup):", JSON.stringify(result.quiz.questions, null, 2));
        }

        if (result && result.quiz && Array.isArray(result.quiz.questions)) {
          const newQuestions = result.quiz.questions.filter((q: Question) => q && q.question && q.question.trim() !== '');
          allQuestions = [...allQuestions, ...newQuestions];
          existingQuestionTitles = [...existingQuestionTitles, ...newQuestions.map((q: Question) => q.question)];
          setGenerationProgress(prev => ({ ...prev, current: allQuestions.length }));
        } else {
            console.warn(`AI returned an invalid response or no questions in batch starting at ${i}.`);
        }
      }

      if (controller.signal.aborted) throw new Error("Cancelled");
      if (allQuestions.length === 0) throw new Error("The AI failed to generate any valid questions.");
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
      if ((error as Error).message === 'Cancelled') return;
      console.error(error);
      const message = error instanceof Error ? error.message : "Quiz generation failed.";
      toast({ variant: "destructive", title: "Error Generating Quiz", description: message });
      setView('setup');
    } finally {
      setIsGeneratingState(false);
      setGenerationController(null);
      setGenerationProgress({ current: 0, total: 0, message: '' });
    }
  // Removed problemImageFile, problemImageDataUrl from dependencies as they are no longer used for this
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
    setCanGenerateCalculative(null);
    // Removed problem image state clearing
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
  
  const loadQuizFromHistory = useCallback(async (id: number, mode: 'retake' | 'results' | 'resume') => {
    try {
      const pastQuiz = await getPastQuizById(id);
      if (pastQuiz) {
        setQuiz(pastQuiz.quiz);
        setTimer(0);
        setUserAnswers(pastQuiz.userAnswers || {});
        const loadedFiles = [{ name: `Source for "${pastQuiz.title}"`, content: pastQuiz.sourceContent }];
        setProcessedFiles(loadedFiles);
        // Removed problem image state clearing
        if (mode === 'results') setView('results');
        else setView('quiz');
      } else {
        toast({ variant: "destructive", title: "History Not Found" });
      }
    } catch(e) {
      toast({ variant: "destructive", title: "Load Error" });
    }
  }, [toast]);

  const removeFile = useCallback(async (fileNameToRemove: string) => {
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

  const toggleEcoMode = useCallback(() => {
    setIsEcoModeActive(prev => !prev);
    // Optionally, you could toast or log here, but the UI will reflect the change.
  }, []);

  const value = {
    processedFiles,
    fileError,
    isParsing,
    parseProgress,
    handleFileChange,
    removeFile,
    stopParsing,
    isAnalyzingContent,
    canGenerateCalculative,

    // Removed problem image states and handlers from context
    
    view,
    quiz,
    userAnswers,
    generationProgress,
    timer,
    isGenerating: isGeneratingState || isParsing || isAnalyzingContent, // Removed isProcessingProblemImage

    isEcoModeActive,
    toggleEcoMode,

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
