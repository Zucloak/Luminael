"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFTextField } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnnotationComponent } from './AnnotationComponent';
import { Upload, Download, Type, Image as ImageIcon, Signature, AlertTriangle, Trash2, Bold, Italic, Underline } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

import * as pdfjsLib from 'pdfjs-dist';

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
  color: string;
};

type ImageAnnotation = AnnotationBase & {
  type: 'image';
  dataUrl: string;
};

type Annotation = TextAnnotation | ImageAnnotation;

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';
}


export function PdfEditor() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'signature' | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draggingState, setDraggingState] = useState<{ id: string; startX: number; startY: number; aX: number; aY: number } | null>(null);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingState) return;
        const dx = e.clientX - draggingState.startX;
        const dy = e.clientY - draggingState.startY;
        updateAnnotation(draggingState.id, { x: draggingState.aX + dx, y: draggingState.aY + dy });
    };
    const handleMouseUp = () => {
        setDraggingState(null);
    };

    if (draggingState) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingState]);

  const handleAnnotationDragStart = (e: React.MouseEvent, id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (!annotation) return;
    setDraggingState({
        id,
        startX: e.clientX,
        startY: e.clientY,
        aX: annotation.x,
        aY: annotation.y,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPdfPages([]);
    setPdfDoc(null);
    setAnnotations([]);
    setSelectedAnnotationId(null);

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

  const renderPage = async (page: any, canvas: HTMLCanvasElement) => {
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
  }

  const exportPdf = async () => {
    if (!pdfDoc) return;

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const annotation of annotations) {
        const page = pdfDoc.getPages()[annotation.pageIndex];
        const { width, height } = page.getSize();
        const canvas = canvasRefs.current[annotation.pageIndex];
        if(!canvas) continue;

        const scaleX = width / canvas.width;
        const scaleY = height / canvas.height;

        const pdfX = annotation.x * scaleX;
        const pdfY = height - (annotation.y * scaleY);

        if (annotation.type === 'text') {
            page.drawText(annotation.text, {
                x: pdfX,
                y: pdfY - (annotation.fontSize * scaleY), // Adjust for text baseline
                font: annotation.isBold ? helveticaBoldFont : helveticaFont,
                size: annotation.fontSize * scaleY,
                color: rgb(0, 0, 0), // Basic color for now
                lineHeight: (annotation.fontSize + 2) * scaleY,
                // Italic and underline would require more complex handling or specific fonts
            });
        } else if (annotation.type === 'image') {
            const imageBytes = await fetch(annotation.dataUrl).then(res => res.arrayBuffer());
            const image = await pdfDoc.embedPng(imageBytes);
            page.drawImage(image, {
                x: pdfX,
                y: pdfY - (annotation.height * scaleY),
                width: annotation.width * scaleX,
                height: annotation.height * scaleY,
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'edited.pdf';
    link.click();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, pageIndex: number) => {
    if (!activeTool) return;
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
        addTextField(x, y, pageIndex);
    }
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
    setSelectedAnnotationId(null);
  }

  const addTextField = (x: number, y: number, pageIndex: number) => {
    const newAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      pageIndex,
      x,
      y,
      width: 150,
      height: 40,
      type: 'text',
      text: 'Type here...',
      fontSize: 16,
      fontFamily: 'Helvetica',
      isBold: false,
      isItalic: false,
      isUnderline: false,
      color: 'black',
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setActiveTool(null);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } as Annotation : a));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, options: { backgroundRemoval: boolean }) => {
    const file = e.target.files?.[0];
    if (!file || !pdfDoc) return;

    let imageB64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
    });

    if (options.backgroundRemoval) {
      try {
        imageB64 = await removeImageBackground(imageB64);
      } catch (err) {
        console.error("Failed to remove background:", err);
        // Optionally, show an error to the user
      }
    }

    const newAnnotation: ImageAnnotation = {
      id: `image-${Date.now()}`,
      pageIndex: 0, // Default to first page for now
      x: 50, y: 50,
      width: 200, height: 100,
      type: 'image',
      dataUrl: imageB64,
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setIsSignatureModalOpen(false); // Close modal if open
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

        // Simple background removal: assumes background is the color of the top-left pixel
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const tolerance = 20; // Tolerance for color matching

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          if (Math.abs(r - bgR) < tolerance && Math.abs(g - bgG) < tolerance && Math.abs(b - bgB) < tolerance) {
            data[i+3] = 0; // Set alpha to 0
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = imageB64;
    });
  };

  const handleSaveSignature = async () => {
    if (!signaturePadRef.current) return;
    const signatureUrl = signaturePadRef.current.toDataURL('image/png');

    const newAnnotation: ImageAnnotation = {
      id: `image-${Date.now()}`,
      pageIndex: 0, // Default to first page
      x: 50, y: 50,
      width: 150, height: 75,
      type: 'image',
      dataUrl: signatureUrl,
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setIsSignatureModalOpen(false);
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

  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

  return (
    <Card className="w-full max-w-6xl mx-auto border-0">
      <CardHeader>
        <CardTitle>PDF Editor</CardTitle>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button asChild variant="outline">
            <label htmlFor="pdf-upload"><Upload className="mr-2 h-4 w-4" /> Upload PDF</label>
          </Button>
          <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />

          <div className="flex items-center gap-2">
            <Button variant={activeTool === 'text' ? 'secondary' : 'outline'} onClick={() => setActiveTool('text')}><Type className="mr-2" /> Text</Button>
            <Button asChild variant={activeTool === 'image' ? 'secondary' : 'outline'} onClick={() => setActiveTool('image')}>
                <label htmlFor="image-upload"><ImageIcon className="mr-2" /> Image</label>
            </Button>
            <input type="file" id="image-upload" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageChange(e, { backgroundRemoval: false })} />

            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogTrigger asChild>
                    <Button variant={activeTool === 'signature' ? 'secondary' : 'outline'} onClick={() => setActiveTool('signature')}><Signature className="mr-2" /> Draw Signature</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Draw or Upload Signature</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-around mb-4">
                      <Button asChild variant="outline">
                          <label htmlFor="signature-upload">Upload Signature</label>
                      </Button>
                      <input type="file" id="signature-upload" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, { backgroundRemoval: true })} />
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
                    <Button onClick={handleSaveSignature}>Save Signature</Button>
                </DialogContent>
            </Dialog>
             <Button variant="outline" onClick={clearAllAnnotations} disabled={annotations.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear All</Button>
          </div>

          <Button onClick={exportPdf} disabled={!pdfDoc}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
        </div>
        {selectedAnnotation && selectedAnnotation.type === 'text' && (
          <div className="flex items-center gap-4 mt-2 p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm">Font Size:</label>
              <Slider
                min={8} max={72} step={1}
                value={[selectedAnnotation.fontSize]}
                onValueChange={(val) => updateAnnotation(selectedAnnotation.id, { fontSize: val[0] })}
                className="w-32"
              />
              <span className="text-sm w-8">{selectedAnnotation.fontSize}</span>
            </div>
            <Button
              variant={selectedAnnotation.isBold ? 'secondary' : 'outline'} size="icon"
              onClick={() => updateAnnotation(selectedAnnotation.id, { isBold: !selectedAnnotation.isBold })}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedAnnotation.isItalic ? 'secondary' : 'outline'} size="icon"
              onClick={() => updateAnnotation(selectedAnnotation.id, { isItalic: !selectedAnnotation.isItalic })}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={selectedAnnotation.isUnderline ? 'secondary' : 'outline'} size="icon"
              onClick={() => updateAnnotation(selectedAnnotation.id, { isUnderline: !selectedAnnotation.isUnderline })}>
              <Underline className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-lg h-[70vh] overflow-auto relative">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="relative">
              {pdfPages.map((page, index) => (
                  <div key={index} className="relative mb-4">
                      <canvas
                          ref={el => {
                              canvasRefs.current[index] = el;
                              if(el && page) renderPage(page, el);
                          }}
                          className="shadow-md"
                          onClick={(e) => handleCanvasClick(e, index)}
                      />
                      <div className="absolute top-0 left-0 w-full h-full" onMouseDown={() => setSelectedAnnotationId(null)} style={{ pointerEvents: 'none' }}>
                          {annotations
                              .filter(a => a.pageIndex === index)
                              .map(annotation => (
                                <div style={{pointerEvents: 'auto'}} key={annotation.id}>
                                  <AnnotationComponent
                                    annotation={annotation}
                                    onUpdate={updateAnnotation}
                                    isSelected={annotation.id === selectedAnnotationId}
                                    onSelect={(e) => { e.stopPropagation(); setSelectedAnnotationId(annotation.id); }}
                                    onDragStart={handleAnnotationDragStart}
                                  />
                                </div>
                              ))}
                      </div>
                  </div>
              ))}
            </div>
            {!pdfDoc && !error && <div className="flex items-center justify-center h-full text-muted-foreground">Upload a PDF to begin editing.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
