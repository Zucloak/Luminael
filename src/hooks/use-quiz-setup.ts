
'use client';

import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApiKey } from '@/hooks/use-api-key';
import { useToast } from '@/hooks/use-toast';
import { ocrImageWithFallback, isCanvasBlank } from '@/lib/ocr';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.mjs`;

interface ParseProgress {
  current: number;
  total: number;
  message: string;
}

interface QuizSetupContextType {
  combinedContent: string;
  fileNames: string[];
  fileError: string;
  isParsing: boolean;
  parseProgress: ParseProgress;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearQuizSetup: () => void;
}

const QuizSetupContext = createContext<QuizSetupContextType | undefined>(undefined);

export function QuizSetupProvider({ children }: { children: ReactNode }) {
  const [combinedContent, setCombinedContent] = useState<string>('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress>({ current: 0, total: 0, message: '' });

  const { apiKey, incrementUsage } = useApiKey();
  const { toast } = useToast();

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

    setCombinedContent("");
    setFileError("");
    setIsParsing(true);
    setParseProgress({ current: 0, total: 0, message: "Preparing to process files..." });
    const fileList = Array.from(files);
    setFileNames(fileList.map(f => f.name));

    let allContents: string[] = [];

    try {
      for (const file of fileList) {
        const { content } = await processFile(file);
        allContents.push(content);
      }
      setCombinedContent(allContents.join("\n\n---\n\n"));
      if (allContents.length > 0) {
        toast({ title: "File processing complete!", description: "Your content is ready." });
      }
    } catch (error) {
      const message = String(error);
      setFileError(message);
      setFileNames([]);
      setCombinedContent("");
      toast({ variant: "destructive", title: "File Processing Error", description: message });
    } finally {
      setIsParsing(false);
      setParseProgress({ current: 0, total: 0, message: "" });
    }
  }, [processFile, apiKey, toast]);
  
  const clearQuizSetup = useCallback(() => {
    setCombinedContent('');
    setFileNames([]);
    setFileError('');
    setIsParsing(false);
    setParseProgress({ current: 0, total: 0, message: '' });
  }, []);

  const value = {
    combinedContent,
    fileNames,
    fileError,
    isParsing,
    parseProgress,
    handleFileChange,
    clearQuizSetup,
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
