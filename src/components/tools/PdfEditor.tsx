"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Type, Image as ImageIcon, AlertTriangle, Trash2, Bold, Italic, Underline, MousePointerClick, Signature, Undo, Redo } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import * as pdfjsLib from 'pdfjs-dist';
import { AnnotationComponent } from './AnnotationComponent';
import { SignatureTool } from './SignatureTool';
import { useHistory } from '@/hooks/use-history';

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
  const { state: annotations, set: setAnnotations, replace: replaceAnnotations, undo, redo, reset: resetAnnotations, canUndo, canRedo } = useHistory<Annotation[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'signature' | 'select' | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderingPages = useRef(new Set<number>());
  const isMounted = useRef(true);
  const [isSignatureToolOpen, setIsSignatureToolOpen] = useState(false);

  // The overlay refs are still needed for positioning and interaction
  const pageOverlayRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        setAnnotations([...annotations, newTextAnnotation]);
        setSelectedElementId(newId);
        setActiveTool('select');
    } else {
        const target = e.target as HTMLElement;
        if (!target.closest('.annotation-component')) {
            setSelectedElementId(null);
        }
    }
  };

  const updateAnnotation = useCallback((updatedAnnotation: Annotation, addToHistory: boolean = true) => {
    const updater = (prevAnnotations: Annotation[]) =>
      prevAnnotations.map(ann => (ann.id === updatedAnnotation.id ? updatedAnnotation : ann));

    if (addToHistory) {
      setAnnotations(updater);
    } else {
      replaceAnnotations(updater);
    }
  }, [setAnnotations, replaceAnnotations]);

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

        setAnnotations([...annotations, newImageAnnotation]);
        e.target.value = ''; // Reset file input
    } catch (err) {
        console.error("Failed to load image", err);
    }
  };

  const handleSaveSignature = (dataUrl: string) => {
    const newSignatureAnnotation: SignatureAnnotation = {
        id: generateUniqueId(),
        pageIndex: 0, // Default to first page
        x: 100,
        y: 100,
        width: 150,
        height: 75, // Default size for signature
        type: 'signature',
        dataUrl: dataUrl,
    };
    setAnnotations([...annotations, newSignatureAnnotation]);
  };

  const clearAllEdits = () => {
    setAnnotations([]);
  }

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

          <Button variant="outline" onClick={() => setIsSignatureToolOpen(true)}>
            <Signature className="mr-2 h-4 w-4" />
            Add Signature
          </Button>
          <SignatureTool
            isOpen={isSignatureToolOpen}
            onClose={() => setIsSignatureToolOpen(false)}
            onSave={handleSaveSignature}
          />

          <Button onClick={exportPdf} disabled={!pdfDoc}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
          <Button variant="destructive" onClick={clearAllEdits} disabled={annotations.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear All</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={undo} disabled={!canUndo}><Undo className="mr-2 h-4 w-4" />Undo</Button>
            <Button variant="outline" onClick={redo} disabled={!canRedo}><Redo className="mr-2 h-4 w-4" />Redo</Button>
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
            {!pdfDoc && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Upload size={48} className="mb-4" />
                    <h3 className="text-lg font-semibold">Upload a PDF to Begin</h3>
                    <p className="text-sm">Your secure, client-side PDF editor.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
