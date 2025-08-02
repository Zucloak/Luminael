"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFTextField } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Upload, Download, Type, Image as ImageIcon, Signature, AlertTriangle, Trash2, Bold, Italic, Underline, MousePointerClick } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationComponent } from './AnnotationComponent';
import { toast } from "sonner"

const generateUniqueId = () => {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const isCanvasEmpty = (canvas: HTMLCanvasElement): boolean => {
    const context = canvas.getContext('2d');
    if (!context) {
        return true; // Cannot get context, assume empty
    }
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
            return false; // Found a non-transparent pixel
        }
    }
    return true; // All pixels are transparent
};

// Define more robust types for annotations
type AnnotationBase = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextAnnotation = AnnotationBase & {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  color: { r: number; g: number; b: number; };
};

type ImageAnnotation = AnnotationBase & {
  type: 'image';
  dataUrl: string;
};

type SignatureAnnotation = AnnotationBase & {
    type: 'signature';
    dataUrl: string;
};

type Annotation = TextAnnotation | ImageAnnotation | SignatureAnnotation;

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';
}

export function PdfEditor() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'signature' | 'select' | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const renderingPages = useRef(new Set<number>());
  const isMounted = useRef(true);
  const [signatureForProcessing, setSignatureForProcessing] = useState<string | null>(null);
  const [isBgRemovalDialogOpen, setIsBgRemovalDialogOpen] = useState(false);
  const [isBgRemovalLoading, setIsBgRemovalLoading] = useState(false);
  const [processedSignatureData, setProcessedSignatureData] = useState<string | null>(null);

  // The overlay refs are still needed for positioning and interaction
  const pageOverlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save state to history
  const saveStateToHistory = React.useCallback((newState: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex + 1] ? history[newIndex + 1] : annotations);
    }
  };

  useEffect(() => {
    if (annotations.length > 0) {
        saveStateToHistory(annotations);
    }
  }, [annotations, saveStateToHistory]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPdfPages([]);
    setPdfDoc(null);
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedElementId(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Load with pdf-lib for editing
      const loadedPdfDoc = await PDFDocument.load(arrayBuffer);
      setPdfDoc(loadedPdfDoc);

      // Load with pdf.js for rendering
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const pages = [];
      canvasRefs.current = new Array(pdfjsDoc.numPages);
      for (let i = 0; i < pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i + 1);
        pages.push(page);
      }
      setPdfPages(pages);
    } catch (err) {
      console.error("Failed to load or render PDF:", err);
      setError("Failed to load PDF. The file may be corrupted or in an unsupported format.");
    }
  };

  const renderPage = async (page: any, canvas: HTMLCanvasElement, pageIndex: number) => {
    if (renderingPages.current.has(pageIndex)) return;

    try {
        renderingPages.current.add(pageIndex);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        if(!context) return;
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
    } catch (error) {
        console.error(`Failed to render page ${pageIndex + 1}:`, error);
    } finally {
        renderingPages.current.delete(pageIndex);
    }
  }

  const exportPdf = async () => {
    if (!pdfDoc) return;

    const newPdfDoc = await pdfDoc.copy();
    const pages = newPdfDoc.getPages();

    for (const annotation of annotations) {
        const page = pages[annotation.pageIndex];
        const { x, y, width, height } = annotation;
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const canvas = canvasRefs.current[annotation.pageIndex];
        if(!canvas) continue;

        const scaleX = pageWidth / canvas.clientWidth;
        const scaleY = pageHeight / canvas.clientHeight;

        if (annotation.type === 'text') {
            const { text, fontSize, fontFamily, isBold, isItalic, isUnderline, color } = annotation;

            let font;
            if (isBold && isItalic) {
                font = await newPdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
            } else if (isBold) {
                font = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
            } else if (isItalic) {
                font = await newPdfDoc.embedFont(StandardFonts.HelveticaOblique);
            } else {
                font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
            }

            const textWidth = font.widthOfTextAtSize(text, fontSize * scaleY);
            const textHeight = font.heightAtSize(fontSize * scaleY);

            page.drawText(text, {
                x: x * scaleX,
                y: pageHeight - (y * scaleY) - textHeight,
                font,
                size: fontSize * scaleY,
                color: rgb(color.r, color.g, color.b),
            });

            if (isUnderline) {
                page.drawLine({
                    start: { x: x * scaleX, y: pageHeight - (y * scaleY) - textHeight - 1 },
                    end: { x: x * scaleX + textWidth, y: pageHeight - (y * scaleY) - textHeight - 1 },
                    thickness: 0.5,
                    color: rgb(color.r, color.g, color.b),
                });
            }
        } else if (annotation.type === 'image' || annotation.type === 'signature') {
            const { dataUrl } = annotation;

            // To ensure consistency and avoid format errors, convert all images to PNG
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error("Could not get canvas context for image conversion.");
                continue;
            }
            const img = document.createElement('img');

            // Wait for image to load
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = dataUrl;
            });

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const pngDataUrl = canvas.toDataURL('image/png');
            const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());

            const image = await newPdfDoc.embedPng(pngBytes);

            // Calculate new dimensions to preserve aspect ratio
            const { width: imgWidth, height: imgHeight } = image.size();
            const boxWidth = width * scaleX;
            const boxHeight = height * scaleY;

            const widthRatio = boxWidth / imgWidth;
            const heightRatio = boxHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio);

            const newWidth = imgWidth * ratio;
            const newHeight = imgHeight * ratio;

            // Center the image in the box
            const xOffset = (boxWidth - newWidth) / 2;
            const yOffset = (boxHeight - newHeight) / 2;

            page.drawImage(image, {
                x: x * scaleX + xOffset,
                y: pageHeight - (y * scaleY) - boxHeight + yOffset,
                width: newWidth,
                height: newHeight,
            });
        }
    }

    const pdfBytes = await newPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'edited.pdf';
    link.click();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (activeTool === 'text') {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newId = generateUniqueId();
        const newTextAnnotation: TextAnnotation = {
            id: newId,
            pageIndex,
            x,
            y,
            width: 150,
            height: 20,
            type: 'text',
            text: 'New Text',
            fontSize: 16,
            fontFamily: 'Helvetica',
            isBold: false,
            isItalic: false,
            isUnderline: false,
            color: { r: 0, g: 0, b: 0 },
        };
        setAnnotations(prev => [...prev, newTextAnnotation]);
        setSelectedElementId(newId);
        setActiveTool('select');
    } else {
        const target = e.target as HTMLElement;
        if (!target.closest('.annotation-component')) {
            setSelectedElementId(null);
        }
    }
  };

  const updateAnnotation = React.useCallback((updatedAnnotation: Annotation) => {
    setAnnotations(prevAnnotations =>
      prevAnnotations.map(ann => (ann.id === updatedAnnotation.id ? updatedAnnotation : ann))
    );
  }, []);

  const deleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(ann => ann.id !== id);
    setAnnotations(newAnnotations);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
        alert("Image too large. Please upload an image smaller than 5MB.");
        return;
    }

    try {
        const dataUrl = URL.createObjectURL(file);

        if (!isMounted.current) return;

        const newImageAnnotation: ImageAnnotation = {
            id: generateUniqueId(),
            pageIndex: 0, // Default to first page
            x: 100,
            y: 100,
            width: 150,
            height: 100,
            type: 'image',
            dataUrl: dataUrl,
        };

        setAnnotations(prev => [...prev, newImageAnnotation]);
        e.target.value = ''; // Reset file input
    } catch (err) {
        console.error("Failed to load image", err);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error("Image too large. Please upload an image smaller than 5MB.");
        return;
    }

    try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string' && event.target.result) {
                    resolve(event.target.result);
                } else {
                    reject(new Error("FileReader result is not a valid string."));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        if (isMounted.current) {
            setSignatureForProcessing(dataUrl);
            setIsBgRemovalDialogOpen(true);
            setIsSignatureModalOpen(false); // Close the first modal
        }
        e.target.value = ''; // Reset file input
    } catch (err) {
        console.error("Failed to load image", err);
        toast.error("Failed to load signature image.");
    }
  };

  const handleProcessSignature = async (removeBg: boolean) => {
    if (!signatureForProcessing) return;

    setIsBgRemovalLoading(true);
    setProcessedSignatureData(null); // Clear previous processed data

    try {
        let finalDataUrl = signatureForProcessing;
        if (removeBg) {
            finalDataUrl = await removeImageBackground(signatureForProcessing);
            toast.success("Background removed successfully!");
        } else {
            // Launder the image to ensure consistent format
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = document.createElement('img');
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = signatureForProcessing;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");
            ctx.drawImage(img, 0, 0);
            finalDataUrl = canvas.toDataURL('image/png');
        }
        if (isMounted.current) {
            setProcessedSignatureData(finalDataUrl);
        }
    } catch (error) {
        console.error("Signature processing failed:", error);
        toast.error("Could not process signature.");
    } finally {
        if(isMounted.current) {
            setIsBgRemovalLoading(false);
        }
    }
  };

  const handleSaveProcessedSignature = () => {
    if (!processedSignatureData) {
        toast.error("No signature to save.", {
            description: "Please process a signature before saving.",
        });
        return;
    }

    const newSignatureAnnotation: SignatureAnnotation = {
        id: generateUniqueId(),
        pageIndex: 0,
        x: 100,
        y: 100,
        width: 150,
        height: 75,
        type: 'signature',
        dataUrl: processedSignatureData,
    };

    if (isMounted.current) {
        setAnnotations(prev => [...prev, newSignatureAnnotation]);
        setIsBgRemovalDialogOpen(false);
        setSignatureForProcessing(null);
        setProcessedSignatureData(null);
    }
  };

  const removeImageBackground = (imageB64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // --- Improved background color detection ---

        // 1. Collect color samples from the border
        const samples: [number, number, number][] = [];
        const borderSize = Math.min(10, Math.floor(canvas.width / 10), Math.floor(canvas.height / 10)); // pixels from the edge

        for (let i = 0; i < canvas.width; i+=5) {
            for (let j = 0; j < borderSize; j+=2) {
                const topIndex = (j * canvas.width + i) * 4;
                samples.push([data[topIndex], data[topIndex + 1], data[topIndex + 2]]);
                const bottomIndex = ((canvas.height - 1 - j) * canvas.width + i) * 4;
                samples.push([data[bottomIndex], data[bottomIndex + 1], data[bottomIndex + 2]]);
            }
        }
        for (let i = 0; i < canvas.height; i+=5) {
            for (let j = 0; j < borderSize; j+=2) {
                 const leftIndex = (i * canvas.width + j) * 4;
                 samples.push([data[leftIndex], data[leftIndex + 1], data[leftIndex + 2]]);
                 const rightIndex = (i * canvas.width + (canvas.width - 1 - j)) * 4;
                 samples.push([data[rightIndex], data[rightIndex + 1], data[rightIndex + 2]]);
            }
        }

        // 2. Find the most frequent color (mode)
        const colorCounts = new Map<string, number>();
        let maxCount = 0;
        let bgColor: [number, number, number] = [255, 255, 255]; // Default to white

        for (const color of samples) {
            if(!color) continue;
            const key = color.join(',');
            const count = (colorCounts.get(key) || 0) + 1;
            colorCounts.set(key, count);
            if (count > maxCount) {
                maxCount = count;
                bgColor = color;
            }
        }

        // --- End of improved detection ---

        const tolerance = 45; // A bit more tolerance
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const distance = Math.sqrt(
                Math.pow(r - bgColor[0], 2) +
                Math.pow(g - bgColor[1], 2) +
                Math.pow(b - bgColor[2], 2)
            );

            if (distance < tolerance) {
                data[i+3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.onerror = reject;
      img.src = imageB64;
    });
  };

  const handleSaveSignature = () => {
    if (!signaturePadRef.current || isCanvasEmpty(signaturePadRef.current)) {
        toast.info("Signature pad is empty.", {
            description: "Please draw a signature before saving.",
        });
        return;
    }

    const signatureUrl = signaturePadRef.current.toDataURL('image/png');

    if (signatureUrl && signatureUrl !== 'data:,') {
        const newSignatureAnnotation: SignatureAnnotation = {
            id: generateUniqueId(),
            pageIndex: 0, // Default to first page
            x: 100,
            y: 100,
            width: 150,
            height: 75, // Default size for signature
            type: 'signature',
            dataUrl: signatureUrl,
        };
        if (isMounted.current) {
            setAnnotations(prev => [...prev, newSignatureAnnotation]);
            setIsSignatureModalOpen(false);
        }
    } else {
        toast.error("Could not save signature.", {
            description: "An error occurred while saving the signature. Please try again.",
        });
    }
  }

  const clearSignaturePad = () => {
    const canvas = signaturePadRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clearAllEdits = () => {
    setAnnotations([]);
    setHistory([]);
    setHistoryIndex(-1);
  }

  const startSigning = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsSigning(true);
    const canvas = signaturePadRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.beginPath();
    context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigning) return;
    const canvas = signaturePadRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    context.stroke();
  };

  const stopSigning = () => {
    setIsSigning(false);
  };

  const selectedAnnotation = annotations.find(a => a.id === selectedElementId);

  return (
    <Card className="w-full max-w-6xl mx-auto border-0">
      <CardHeader>
        <CardTitle>PDF Editor</CardTitle>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button asChild variant="outline">
            <label htmlFor="pdf-upload"><Upload className="mr-2 h-4 w-4" /> Upload PDF</label>
          </Button>
          <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />

          <Button variant={activeTool === 'text' ? 'secondary' : 'outline'} onClick={() => setActiveTool('text')}><Type className="mr-2" /> Add Text</Button>
          <Button variant={activeTool === 'select' ? 'secondary' : 'outline'} onClick={() => setActiveTool('select')}><MousePointerClick className="mr-2 h-4 w-4" /> Select/Edit</Button>

          {selectedAnnotation && selectedAnnotation.type === 'text' && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Button variant="outline" size="icon" onClick={() => {
                    const newAnnotation = { ...selectedAnnotation, isBold: !selectedAnnotation.isBold };
                    updateAnnotation(newAnnotation);
                }}><Bold className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => {
                    const newAnnotation = { ...selectedAnnotation, isItalic: !selectedAnnotation.isItalic };
                    updateAnnotation(newAnnotation);
                }}><Italic className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => {
                    const newAnnotation = { ...selectedAnnotation, isUnderline: !selectedAnnotation.isUnderline };
                    updateAnnotation(newAnnotation);
                }}><Underline className="h-4 w-4" /></Button>
                <input
                    type="number"
                    min="1"
                    onChange={(e) => {
                        const newAnnotation = { ...selectedAnnotation, fontSize: parseInt(e.target.value) || 1 };
                        updateAnnotation(newAnnotation);
                    }}
                    value={selectedAnnotation.fontSize}
                    className="bg-background border border-input rounded-md px-2 py-1 text-sm w-20"
                />
            </div>
          )}

          <Button asChild variant="outline">
            <label htmlFor="image-upload-btn"><ImageIcon className="mr-2" /> Add Image</label>
          </Button>
          <input type="file" id="image-upload-btn" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e)} />

          <Dialog open={isSignatureModalOpen} onOpenChange={(isOpen) => {
              setIsSignatureModalOpen(isOpen);
              if (!isOpen) {
                  clearSignaturePad();
              }
          }}>
              <DialogTrigger asChild>
                  <Button variant="outline"><Signature className="mr-2" /> Signature</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Draw or Upload Signature</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-around mb-4">
                    <Button asChild variant="outline">
                        <label htmlFor="signature-upload-btn">Upload Signature</label>
                    </Button>
                    <input type="file" id="signature-upload-btn" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                  </div>
                  <canvas
                      ref={signaturePadRef}
                      width="400"
                      height="200"
                      className="bg-gray-200 rounded-md"
                      onMouseDown={startSigning}
                      onMouseMove={drawSignature}
                      onMouseUp={stopSigning}
                      onMouseLeave={stopSigning}
                  ></canvas>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={clearSignaturePad}>Clear</Button>
                    <Button onClick={handleSaveSignature}>Save Signature</Button>
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={isBgRemovalDialogOpen} onOpenChange={(isOpen) => {
              setIsBgRemovalDialogOpen(isOpen);
              if (!isOpen) {
                  // Reset states when dialog is closed
                  setSignatureForProcessing(null);
                  setProcessedSignatureData(null);
              }
          }}>
              <DialogContent className="max-w-[90vw] md:max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                      <DialogTitle>Process and Save Signature</DialogTitle>
                  </DialogHeader>
                  <div className="flex-grow my-4 overflow-y-auto">
                      <div className="relative w-full h-full min-h-[300px]">
                          {(processedSignatureData || signatureForProcessing) && (
                              <Image
                                  src={processedSignatureData || signatureForProcessing!}
                                  alt="Signature preview"
                                  layout="fill"
                                  objectFit="contain"
                                  unoptimized
                              />
                          )}
                      </div>
                  </div>
                  {isBgRemovalLoading && <div className="text-center my-2">Processing...</div>}
                  <div className="flex justify-between items-center gap-2">
                      <div className="flex gap-2">
                          <Button variant="outline" onClick={() => handleProcessSignature(false)} disabled={isBgRemovalLoading}>Use as-is</Button>
                          <Button onClick={() => handleProcessSignature(true)} disabled={isBgRemovalLoading}>Clear Background</Button>
                      </div>
                      <Button onClick={handleSaveProcessedSignature} disabled={!processedSignatureData || isBgRemovalLoading}>Save Signature</Button>
                  </div>
              </DialogContent>
          </Dialog>

          <Button onClick={exportPdf} disabled={!pdfDoc}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
          <Button variant="outline" onClick={clearAllEdits}><Trash2 className="mr-2 h-4 w-4" /> Clear All</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleUndo} disabled={historyIndex <= 0}>Undo</Button>
            <Button variant="outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>Redo</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="pdf-container" style={{
            width: '100%',
            height: '70vh', // Keep a fixed height for the viewport
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#f1f5f9', // Equivalent to bg-muted
            padding: '1rem',
            borderRadius: '0.5rem',
        }}>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {pdfPages.map((page, index) => (
                <div key={index} className="relative mb-4" style={{ position: 'relative' }}
                    onClick={(e) => handleCanvasClick(e, index)}
                >
                    <canvas
                        ref={el => {
                            canvasRefs.current[index] = el;
                            if(el && page) renderPage(page, el, index);
                        }}
                        className="pdf-page-canvas shadow-md"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                    <div
                        id={`page-overlay-${index}`}
                        ref={el => { pageOverlayRefs.current[index] = el; }}
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
                    >
                        {annotations.filter(a => a.pageIndex === index).map(annotation => (
                            <AnnotationComponent
                                key={annotation.id}
                                annotation={annotation}
                                isSelected={selectedElementId === annotation.id}
                                onSelect={setSelectedElementId}
                                onDelete={deleteAnnotation}
                                updateAnnotation={updateAnnotation}
                                activeTool={activeTool}
                            />
                        ))}
                    </div>
                </div>
            ))}
            {!pdfDoc && !error && <div className="flex items-center justify-center h-full text-muted-foreground">Upload a PDF to begin editing.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
