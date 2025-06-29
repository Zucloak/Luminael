
'use client';

import Tesseract from 'tesseract.js';

export async function ocrImageWithFallback(
  imageDataUrl: string,
  apiKey: string | null,
  incrementUsage: (amount?: number) => void
): Promise<{ text: string; source: 'local' | 'ai' }> {
  // Tier 1: Local OCR
  const {
    data: { text: localText, confidence },
  } = await Tesseract.recognize(imageDataUrl, 'eng');

  // If local OCR is good enough, use it.
  if (localText && localText.trim().length > 20 && confidence > 70) {
    return { text: localText, source: 'local' };
  }
  
  // Can't proceed to AI without a key.
  if (!apiKey) {
    // Return the best local attempt we have.
    return { text: localText, source: 'local' };
  }
  
  incrementUsage();

  // Tier 2: AI OCR Fallback
  const response = await fetch('/api/extract-text-from-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, localOcrAttempt: localText, apiKey }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorDetails = responseText;
    try {
      const errorData = JSON.parse(responseText);
      errorDetails =
        errorData.details || errorData.error || 'An unknown server error occurred.';
    } catch (e) {
      // Not JSON
    }
    throw new Error(`AI OCR Failed: ${errorDetails}`);
  }

  const data = JSON.parse(responseText);
  return { text: data.extractedText, source: 'ai' };
}

export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d');
  if (!context) return true;

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0xFFFFFFFF && color !== 0);
}
