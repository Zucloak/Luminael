"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFTextField } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Type, Image as ImageIcon, Signature, AlertTriangle, Trash2, Bold, Italic, Underline, MousePointerClick } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationComponent } from './AnnotationComponent';

const generateUniqueId = () => {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
            const img = new Image();

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

  const updateAnnotation = (updatedAnnotation: Annotation) => {
    const newAnnotations = annotations.map(ann => ann.id === updatedAnnotation.id ? updatedAnnotation : ann);
    setAnnotations(newAnnotations);
  };

  const deleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(ann => ann.id !== id);
    setAnnotations(newAnnotations);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, options?: { isSignature: boolean }) => {
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

    if (options?.isSignature) {
        setIsUploadingSignature(true);
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

        if (!isMounted.current) return;

        const newAnnotation: Annotation = {
            id: generateUniqueId(),
            pageIndex: 0, // Default to first page
            x: 100,
            y: 100,
            width: options?.isSignature ? 150 : 150,
            height: options?.isSignature ? 75 : 100,
            type: options?.isSignature ? 'signature' : 'image',
            dataUrl: dataUrl,
        };

        setAnnotations(prev => [...prev, newAnnotation]);

        if (options?.isSignature) {
            setIsSignatureModalOpen(false);
        }
        e.target.value = ''; // Reset file input
    } catch (err) {
        console.error("Failed to load image", err);
    } finally {
        if (options?.isSignature) {
            setIsUploadingSignature(false);
        }
    }
  };

  const removeImageBackground = (imageB64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check corners for background color
        const corners = [
            [data[0], data[1], data[2]], // top-left
            [data[(canvas.width - 1) * 4], data[(canvas.width - 1) * 4 + 1], data[(canvas.width - 1) * 4 + 2]], // top-right
            [data[(canvas.height - 1) * canvas.width * 4], data[(canvas.height - 1) * canvas.width * 4 + 1], data[(canvas.height - 1) * canvas.width * 4 + 2]], // bottom-left
            [data[data.length - 4], data[data.length - 3], data[data.length - 2]] // bottom-right
        ];

        const tolerance = 30; // Increased tolerance
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            for (const corner of corners) {
                if (Math.abs(r - corner[0]) < tolerance && Math.abs(g - corner[1]) < tolerance && Math.abs(b - corner[2]) < tolerance) {
                    data[i+3] = 0;
                    break;
                }
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
    if (!signaturePadRef.current) return;
    const signatureUrl = signaturePadRef.current.toDataURL('image/png');
    if (signatureUrl) {
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
        }
    }
    if (isMounted.current) {
        setIsSignatureModalOpen(false);
    }
  }

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

          <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline"><Signature className="mr-2" /> Signature</Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Draw or Upload Signature</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-around mb-4">
                    <Button asChild variant="outline" disabled={isUploadingSignature}>
                        <label htmlFor="signature-upload-btn">Upload Signature</label>
                    </Button>
                    <input type="file" id="signature-upload-btn" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, { isSignature: true })} />
                  </div>
                  {isUploadingSignature && <div className="text-center">Uploading...</div>}
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
                  <Button onClick={handleSaveSignature}>Save Signature</Button>
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
