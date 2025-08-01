"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Pencil, Trash2, Download, Brush } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type BrushType = 'pencil' | 'marker' | 'spray';

export function Sketcher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushType, setBrushType] = useState<BrushType>('pencil');
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set initial canvas size
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = 400; // or some other default
    }

    // Fill background
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setIsDrawing(true);
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Set brush properties for all types
    context.strokeStyle = isErasing ? '#FFFFFF' : color;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (isErasing) {
        context.globalCompositeOperation = 'destination-out';
    } else {
        switch (brushType) {
            case 'pencil':
                context.globalCompositeOperation = 'source-over';
                break;
            case 'marker':
                context.globalCompositeOperation = 'multiply';
                break;
            case 'spray':
                context.globalCompositeOperation = 'source-over';
                break;
        }
    }

    // Start drawing
    context.beginPath();
    context.moveTo(x, y);
    // Draw a single dot for the start of the line
    context.lineTo(x, y);
    context.stroke();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (brushType === 'spray' && !isErasing) {
        drawSpray(context, x, y);
    } else {
        context.lineTo(x, y);
        context.stroke();
    }
  };

  const drawSpray = (context: CanvasRenderingContext2D, x: number, y: number) => {
    const density = brushSize * 2.5;
    for (let i = 0; i < density; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize * 2;
        const offsetY = (Math.random() - 0.5) * brushSize * 2;
        if (Math.sqrt(offsetX * offsetX + offsetY * offsetY) < brushSize) {
            context.fillStyle = color;
            context.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
    }
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  const exportToPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    html2canvas(canvas).then((canvasImg) => {
      const imgData = canvasImg.toDataURL('image/png');
      const pdf = new jsPDF('l', 'px', [canvas.width, canvas.height]);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save("sketch.pdf");
    });
  };

  const [cursorUrl, setCursorUrl] = useState('');

  useEffect(() => {
    const generateCursor = (size: number) => {
      const strokeWidth = 1;
      const diameter = Math.max(2, size);
      const radius = diameter / 2;
      const svgSize = diameter + strokeWidth * 2;
      const center = svgSize / 2;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
                      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="black" stroke-width="${strokeWidth}"/>
                   </svg>`;

      const encodedSvg = encodeURIComponent(svg);
      return `url('data:image/svg+xml;utf8,${encodedSvg}') ${center} ${center}, crosshair`;
    };
    setCursorUrl(generateCursor(brushSize));
  }, [brushSize]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-0">
      <CardHeader>
        <CardTitle>Sketchpad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-muted rounded-lg">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Brush className="mr-2" /> {brushType}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setBrushType('pencil'); setIsErasing(false); }}>Pencil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBrushType('marker'); setIsErasing(false); }}>Marker</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBrushType('spray'); setIsErasing(false); }}>Spray</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={() => setIsErasing(true)}><Eraser /></Button>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-14 h-10 p-1" />
          <div className="flex items-center gap-2">
            <label>Brush Size:</label>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              className="w-32"
            />
            <span>{brushSize}</span>
          </div>
          <Button variant="outline" onClick={clearCanvas}><Trash2 className="mr-2" /> Clear</Button>
          <Button onClick={exportToPdf}><Download className="mr-2" /> Export as PDF</Button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="bg-white rounded-md"
          style={{ width: '100%', height: '500px', cursor: isErasing ? 'crosshair' : cursorUrl }}
        />
      </CardContent>
    </Card>
  );
}
