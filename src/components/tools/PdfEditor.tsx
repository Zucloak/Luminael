"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Type, Image as ImageIcon, Signature, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export function PdfEditor() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'signature' | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number, pageIndex: number, canvasTop: number, canvasLeft: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    // Set worker source only on the client
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

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
    if (activeTool !== 'text') return;
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTextInput({ x, y, pageIndex, canvasTop: canvas.offsetTop, canvasLeft: canvas.offsetLeft });
    setTextValue('');
  };

  const addTextToPdf = async () => {
    if (!pdfDoc || !textInput || !textValue) {
      setTextInput(null);
      return;
    }

    const { x, y, pageIndex } = textInput;
    const page = pdfDoc.getPages()[pageIndex];
    const { width, height } = page.getSize();
    const canvas = canvasRefs.current[pageIndex];
    if(!canvas) return;

    const pdfX = (x / canvas.width) * width;
    const pdfY = height - (y / canvas.height) * height;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(textValue, {
        x: pdfX,
        y: pdfY,
        font,
        size: 12,
        color: rgb(0, 0, 0),
    });

    setTextInput(null);
    setTextValue('');

    // Re-render the page
    const pdfBytes = await pdfDoc.save();
    const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const newPage = await pdfjsDoc.getPage(textInput.pageIndex + 1);
    await renderPage(newPage, canvas);
  };

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
            <Button variant={activeTool === 'image' ? 'secondary' : 'outline'} onClick={() => setActiveTool('image')} disabled><ImageIcon className="mr-2" /> Image</Button>
            <Button variant={activeTool === 'signature' ? 'secondary' : 'outline'} onClick={() => setActiveTool('signature')} disabled><Signature className="mr-2" /> Signature</Button>
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
            {textInput && (
              <textarea
                style={{
                  position: 'absolute',
                  left: textInput.canvasLeft + textInput.x,
                  top: textInput.canvasTop + textInput.y,
                  border: '1px solid blue',
                  background: 'white',
                  color: 'black',
                  zIndex: 100,
                }}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onBlur={addTextToPdf}
                autoFocus
              />
            )}
        </div>
      </CardContent>
    </Card>
  );
}
