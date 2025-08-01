"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFTextField } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const pageOverlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
        const toolbar = document.getElementById('textToolbar');
        if (toolbar && e.target instanceof HTMLElement && e.target.classList.contains('editable-text')) {
            toolbar.style.display = 'flex';
        } else if (toolbar) {
            toolbar.style.display = 'none';
        }
    };
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPdfPages([]);
    setPdfDoc(null);
    pageOverlayRefs.current.forEach(overlay => {
        if (overlay) overlay.innerHTML = '';
    });

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

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        const overlay = pageOverlayRefs.current[i];
        const canvas = canvasRefs.current[i];
        if (!overlay || !canvas) continue;

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / canvas.clientWidth;
        const scaleY = pageHeight / canvas.clientHeight;

        const elements = overlay.querySelectorAll('.editable-text, .inserted-img');
        for (const element of Array.from(elements)) {
            const htmlEl = element as HTMLElement;
            const x = parseFloat(htmlEl.style.left) * scaleX;
            const y = pageHeight - (parseFloat(htmlEl.style.top) * scaleY);

            if (htmlEl.classList.contains('editable-text')) {
                page.drawText(htmlEl.innerText, {
                    x,
                    y: y - (parseFloat(htmlEl.style.fontSize) * scaleY),
                    font: htmlEl.style.fontWeight === 'bold' ? helveticaBoldFont : helveticaFont,
                    size: parseFloat(htmlEl.style.fontSize) * scaleY,
                    color: rgb(0, 0, 0),
                });
            } else if (htmlEl.tagName === 'IMG') {
                const imgEl = htmlEl as HTMLImageElement;
                const imageBytes = await fetch(imgEl.src).then(res => res.arrayBuffer());
                let image;
                if (imgEl.src.includes('png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }
                page.drawImage(image, {
                    x,
                    y: y - (imgEl.clientHeight * scaleY),
                    width: imgEl.clientWidth * scaleX,
                    height: imgEl.clientHeight * scaleY,
                });
            }
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


  const addTextField = (x: number, y: number, pageIndex: number) => {
    const overlay = pageOverlayRefs.current[pageIndex];
    if (!overlay) return;

    const textBox = document.createElement('div');
    textBox.contentEditable = 'true';
    textBox.classList.add('editable-text');
    textBox.style.cssText = `
      position: absolute;
      top: ${y}px;
      left: ${x}px;
      font-size: 16px;
      font-family: Helvetica, Arial, sans-serif;
      padding: 2px;
      border: 1px solid transparent;
      cursor: move;
      z-index: 10;
    `;
    textBox.innerText = 'Edit me';

    let isDragging = false;
    let dragStartX: number, dragStartY: number;

    textBox.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX - textBox.offsetLeft;
        dragStartY = e.clientY - textBox.offsetTop;
        textBox.style.cursor = 'grabbing';
        e.stopPropagation();
    });

    overlay.addEventListener('mousemove', (e) => {
        if (isDragging) {
            textBox.style.left = `${e.clientX - dragStartX}px`;
            textBox.style.top = `${e.clientY - dragStartY}px`;
        }
    });

    overlay.addEventListener('mouseup', () => {
        isDragging = false;
        textBox.style.cursor = 'move';
    });

    textBox.addEventListener('focus', () => {
        textBox.style.border = '1px dashed #3b82f6';
    });

    textBox.addEventListener('blur', () => {
        textBox.style.border = '1px solid transparent';
    });

    overlay.appendChild(textBox);
    setActiveTool(null);
  };

  const addImageToOverlay = (imageUrl: string, pageIndex: number) => {
    const overlay = pageOverlayRefs.current[pageIndex];
    if (!overlay) return;

    const img = document.createElement('img');
    img.src = imageUrl;
    img.classList.add('inserted-img');
    img.style.cssText = `
        position: absolute;
        top: 100px;
        left: 100px;
        width: 150px;
        cursor: move;
        z-index: 10;
    `;

    // Add drag handling
    let isDragging = false;
    let dragStartX: number, dragStartY: number;
    img.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX - img.offsetLeft;
        dragStartY = e.clientY - img.offsetTop;
        e.stopPropagation();
    });
    overlay.addEventListener('mousemove', (e) => {
        if (isDragging) {
            img.style.left = `${e.clientX - dragStartX}px`;
            img.style.top = `${e.clientY - dragStartY}px`;
        }
    });
    overlay.addEventListener('mouseup', () => { isDragging = false; });

    overlay.appendChild(img);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, options: { backgroundRemoval: boolean }) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let imageUrl = URL.createObjectURL(file);

    if (options.backgroundRemoval) {
        const imageB64 = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(file);
        });
        try {
            const processedB64 = await removeImageBackground(imageB64);
            imageUrl = processedB64;
        } catch (err) {
            console.error("Failed to remove background", err);
        }
    }

    addImageToOverlay(imageUrl, 0); // Default to first page
    setIsSignatureModalOpen(false);
    e.target.value = ''; // Reset file input
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
        const bgR = data[0], bgG = data[1], bgB = data[2];
        const tolerance = 10;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.abs(data[i] - bgR) < tolerance && Math.abs(data[i+1] - bgG) < tolerance && Math.abs(data[i+2] - bgB) < tolerance) {
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
    if (!signaturePadRef.current) return;
    const signatureUrl = signaturePadRef.current.toDataURL('image/png');
    if (signatureUrl) {
        addImageToOverlay(signatureUrl, 0); // Default to first page
    }
    setIsSignatureModalOpen(false);
  }

  const clearAllEdits = () => {
    pageOverlayRefs.current.forEach(overlay => {
        if (overlay) {
            const annotations = overlay.querySelectorAll('.editable-text, .inserted-img');
            annotations.forEach(el => el.remove());
        }
    });
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

  return (
    <Card className="w-full max-w-6xl mx-auto border-0">
      <CardHeader>
        <CardTitle>PDF Editor</CardTitle>
        <div id="textToolbar" className="flex items-center gap-4 mt-2 p-2 bg-muted rounded-lg" style={{ display: 'none' }}>
            <Button variant="outline" size="icon" onClick={() => document.execCommand('bold')}><Bold className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => document.execCommand('italic')}><Italic className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => document.execCommand('underline')}><Underline className="h-4 w-4" /></Button>
            <select onChange={(e) => document.execCommand('fontSize', false, e.target.value)} className="bg-background border border-input rounded-md px-2 py-1 text-sm">
                <option value="3">12px</option>
                <option value="4">14px</option>
                <option value="5">16px</option>
                <option value="6">20px</option>
            </select>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button asChild variant="outline">
            <label htmlFor="pdf-upload"><Upload className="mr-2 h-4 w-4" /> Upload PDF</label>
          </Button>
          <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />

          <Button variant="outline" onClick={() => setActiveTool('text')}><Type className="mr-2" /> Text</Button>

          <Button asChild variant="outline">
            <label htmlFor="image-upload-btn"><ImageIcon className="mr-2" /> Image</label>
          </Button>
          <input type="file" id="image-upload-btn" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageChange(e, { backgroundRemoval: false })} />

          <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
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
                    <input type="file" id="signature-upload-btn" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, { backgroundRemoval: true })} />
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

          <Button onClick={exportPdf} disabled={!pdfDoc}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
          <Button variant="outline" onClick={clearAllEdits}><Trash2 className="mr-2 h-4 w-4" /> Clear All</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-lg h-[70vh] overflow-auto" style={{ position: 'relative', height: 'auto !important', overflow: 'visible' }}>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {pdfPages.map((page, index) => (
                <div key={index} className="relative mb-4" style={{ position: 'relative' }}>
                    <canvas
                        ref={el => {
                            canvasRefs.current[index] = el;
                            if(el && page) renderPage(page, el);
                        }}
                        className="shadow-md"
                        style={{ pointerEvents: 'none' }}
                        onClick={(e) => handleCanvasClick(e, index)}
                    />
                    <div
                        id={`page-overlay-${index}`}
                        ref={el => { pageOverlayRefs.current[index] = el; }}
                        className="absolute top-0 left-0 w-full h-full"
                        style={{ pointerEvents: 'auto' }}
                    />
                </div>
            ))}
            {!pdfDoc && !error && <div className="flex items-center justify-center h-full text-muted-foreground">Upload a PDF to begin editing.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
