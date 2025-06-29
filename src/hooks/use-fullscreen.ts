
"use client";

import { useState, useEffect, useCallback } from 'react';

// Define a type for the document with potential vendor prefixes
interface DocumentWithFullscreen extends Document {
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

// Define a type for the element with potential vendor prefixes
interface HTMLElementWithFullscreen extends HTMLElement {
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

function isDocumentInFullscreen(doc: DocumentWithFullscreen): boolean {
    return !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
}


export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Assume supported on server, check on client

  const handleFullscreenChange = useCallback(() => {
    const doc = document as DocumentWithFullscreen;
    setIsFullscreen(isDocumentInFullscreen(doc));
  }, []);

  useEffect(() => {
    // Check for support on mount, which also handles server-side rendering gracefully.
    const element = document.documentElement as HTMLElementWithFullscreen;
    const supported = !!(
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen
    );
    setIsSupported(supported);
    
    // Set initial state
    handleFullscreenChange();

    const doc = document as DocumentWithFullscreen;
    doc.addEventListener('fullscreenchange', handleFullscreenChange);
    doc.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    doc.addEventListener('mozfullscreenchange', handleFullscreenChange);
    doc.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      doc.removeEventListener('fullscreenchange', handleFullscreenChange);
      doc.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      doc.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);
  
  const toggleFullscreen = useCallback(() => {
    const doc = document as DocumentWithFullscreen;
    const element = document.documentElement as HTMLElementWithFullscreen;

    if (!isDocumentInFullscreen(doc)) {
      // Try to enter fullscreen
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        element.webkitRequestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      }
    } else {
      // Try to exit fullscreen
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) { // Chrome, Safari and Opera
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) { // Firefox
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) { // IE/Edge
        doc.msExitFullscreen();
      }
    }
  }, []);

  return { isFullscreen, toggleFullscreen, isSupported };
}
