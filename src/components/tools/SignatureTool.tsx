"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { toast } from 'sonner';

type SignatureToolProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

const isCanvasEmpty = (canvas: HTMLCanvasElement): boolean => {
  const context = canvas.getContext('2d');
  if (!context) return true;
  const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
  return !pixelBuffer.some(pixel => pixel !== 0);
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

        const borderSize = Math.min(10, Math.floor(canvas.width / 10), Math.floor(canvas.height / 10));
        const samples: [number, number, number][] = [];

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

        const colorCounts = new Map<string, number>();
        let maxCount = 0;
        let bgColor: [number, number, number] = [255, 255, 255];

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

        const tolerance = 45;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const distance = Math.sqrt(Math.pow(r - bgColor[0], 2) + Math.pow(g - bgColor[1], 2) + Math.pow(b - bgColor[2], 2));
            if (distance < tolerance) data[i+3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (err) => reject(err);
      img.src = imageB64;
    });
};


export const SignatureTool = ({ isOpen, onClose, onSave }: SignatureToolProps) => {
  const [activeTab, setActiveTab] = useState('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      clearCanvas();
      setUploadedImage(null);
      setProcessedImage(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Drawing logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Upload logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image is too large. Please select a file smaller than 5MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
        setProcessedImage(null); // Clear any previous processed image
    };
    reader.onerror = () => {
        toast.error("Failed to read the uploaded file.");
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input
  };

  const handleProcessImage = async (removeBg: boolean) => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    try {
        let finalDataUrl = uploadedImage;
        if (removeBg) {
            finalDataUrl = await removeImageBackground(uploadedImage);
            toast.success("Background removed successfully!");
        }
        setProcessedImage(finalDataUrl);
    } catch (error) {
        console.error("Image processing failed:", error);
        toast.error("Could not process the image. Please try another one.");
        setProcessedImage(null); // Clear on failure
    } finally {
        setIsProcessing(false);
    }
  };

  // Save logic
  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || isCanvasEmpty(canvas)) {
        toast.info("Please draw a signature before saving.");
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    } else if (activeTab === 'upload') {
      if (!processedImage && !uploadedImage) {
          toast.info("Please upload an image to save.");
          return;
      }
      // If the user clicked "Use as-is", processedImage will be null, so we use the original.
      // If they cleared the background, processedImage will be set.
      const imageToSave = processedImage || uploadedImage;
      if (!imageToSave) {
          toast.error("No valid image to save.");
          return;
      }
      onSave(imageToSave);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Signature</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="draw">
            <div className="flex flex-col items-center gap-4 py-4">
              <canvas
                ref={canvasRef}
                width="400"
                height="200"
                className="bg-gray-100 dark:bg-gray-800 rounded-md cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Button variant="outline" onClick={clearCanvas} className="w-full">Clear</Button>
            </div>
          </TabsContent>
          <TabsContent value="upload">
            <div className="flex flex-col items-center gap-4 py-4">
              <Input id="signature-upload" type="file" accept="image/*" onChange={handleFileUpload} />
              {uploadedImage && (
                <div className="w-full p-2 border rounded-md">
                   <div className="relative w-full h-48">
                     <Image src={processedImage || uploadedImage} alt="Signature Preview" layout="fill" objectFit="contain" />
                   </div>
                </div>
              )}
              {uploadedImage && (
                <div className="flex w-full gap-2">
                  <Button variant="outline" onClick={() => handleProcessImage(false)} disabled={isProcessing} className="flex-1">
                    {isProcessing ? 'Processing...' : 'Use As Is'}
                  </Button>
                  <Button onClick={() => handleProcessImage(true)} disabled={isProcessing} className="flex-1">
                    {isProcessing ? 'Processing...' : 'Clear Background'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Signature</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
