"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PDFTextField } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Type, Image as ImageIcon, Signature, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';
}


export function PdfEditor() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'signature' | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number, pageIndex: number } | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPdfPages([]);
    setPdfDoc(null);

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

  const addTextField = async (x: number, y: number, pageIndex: number) => {
    if (!pdfDoc) return;
    const page = pdfDoc.getPages()[pageIndex];
    const { width, height } = page.getSize();
    const canvas = canvasRefs.current[pageIndex];
    if(!canvas) return;

    const pdfX = (x / canvas.width) * width;
    const pdfY = height - (y / canvas.height) * height;

    const form = pdfDoc.getForm();
    const textField = form.createTextField(`text.field.${Date.now()}`);
    textField.setText('Enter text here');
    textField.addToPage(page, { x: pdfX, y: pdfY, width: 150, height: 20 });

    await rerenderAllPages();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pdfDoc) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const imageBytes = await file.arrayBuffer();
    const image = await pdfDoc.embedPng(imageBytes);
    const page = pdfDoc.getPages()[0]; // Default to first page
    page.drawImage(image, {
        x: 50,
        y: page.getHeight() - 150,
        width: 100,
        height: 100,
    });

    await rerenderAllPages();
  };

  const handleSaveSignature = async () => {
    if (!pdfDoc || !signaturePadRef.current) return;
    const signatureUrl = signaturePadRef.current.toDataURL('image/png');
    const signatureBytes = await fetch(signatureUrl).then(res => res.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    const page = pdfDoc.getPages()[0]; // Default to first page
    page.drawImage(signatureImage, {
        x: 200,
        y: page.getHeight() - 150,
        width: 150,
        height: 75,
    });

    setIsSignatureModalOpen(false);
    await rerenderAllPages();
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

  const rerenderAllPages = async () => {
    if (!pdfDoc) return;
    const pdfBytes = await pdfDoc.save();
    const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const pages = [];
    for (let i = 0; i < pdfjsDoc.numPages; i++) {
        const page = await pdfjsDoc.getPage(i + 1);
        pages.push(page);
    }
    setPdfPages(pages);
  }

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
            <input type="file" id="image-upload" accept="image/png, image/jpeg" className="hidden" onChange={handleImageChange} />

            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogTrigger asChild>
                    <Button variant={activeTool === 'signature' ? 'secondary' : 'outline'} onClick={() => setActiveTool('signature')}><Signature className="mr-2" /> Signature</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Draw your signature</DialogTitle>
                    </DialogHeader>
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
          </div>

          <Button onClick={exportPdf} disabled={!pdfDoc}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
        </div>
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
            {pdfPages.map((page, index) => (
                <canvas
                    key={index}
                    ref={el => {
                        canvasRefs.current[index] = el;
                        if(el && page) renderPage(page, el);
                    }}
                    className="mb-4 shadow-md"
                    onClick={(e) => handleCanvasClick(e, index)}
                />
            ))}
            {!pdfDoc && !error && <div className="flex items-center justify-center h-full text-muted-foreground">Upload a PDF to begin editing.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
