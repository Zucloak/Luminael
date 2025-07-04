
'use client';

import Tesseract from 'tesseract.js';

export async function ocrImageWithFallback(
  imageDataUrl: string,
  apiKey: string | null,
  incrementUsage: (amount?: number) => void,
  isEcoModeActive?: boolean // Optional, but will be provided by use-quiz-setup
): Promise<{ text: string; source: 'local' | 'ai'; confidence?: number }> {
  // Tier 1: Local OCR
  // For now, we'll assume Tesseract.recognize can throw an error on failure.
  // The "Local-First OCR Pipeline" (Update 2) will enhance this part significantly.
  let localText = '';
  let confidence = 0;
  let localOcrError = false;

  try {
    let processedImageDataUrl = imageDataUrl;
    if (isEcoModeActive) { // Apply preprocessing only in Eco Mode for now
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = imageDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Grayscale and Binarization (simple thresholding)
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const color = avg > 128 ? 255 : 0; // Simple threshold at 128
          data[i] = color;     // Red
          data[i + 1] = color; // Green
          data[i + 2] = color; // Blue
        }
        ctx.putImageData(imageData, 0, 0);
        processedImageDataUrl = canvas.toDataURL('image/png');
      }
    }
    // Use processedImageDataUrl for Tesseract
    const result = await Tesseract.recognize(processedImageDataUrl, 'eng');
    localText = result.data.text;
    confidence = result.data.confidence;
  } catch (err) {
    console.error("Local OCR (Tesseract) failed:", err);
    localOcrError = true; // Mark that local OCR itself had an issue
    // We'll still return empty text and zero confidence, allowing UI to prompt if needed.
  }

  if (isEcoModeActive) {
    // In Eco Mode, always return the local result, regardless of confidence.
    // The UI/caller will decide if it's good enough or if user should be prompted.
    return { text: localText, source: 'local', confidence };
  }

  // If NOT in Eco Mode, proceed with existing fallback logic
  // If local OCR is good enough, use it.
  if (!localOcrError && localText && localText.trim().length > 20 && confidence > 70) {
    return { text: localText, source: 'local', confidence };
  }
  
  // Can't proceed to AI without a key if local OCR wasn't sufficient or failed.
  if (!apiKey) {
    // Return the best local attempt we have, including its confidence.
    return { text: localText, source: 'local', confidence };
  }
  
  incrementUsage(); // Only increment if we are actually making an AI call

  // Tier 2: AI OCR Fallback (only if not in Eco Mode and local OCR was insufficient/failed)
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
