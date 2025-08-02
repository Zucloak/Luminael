
"use client";

import { useState, useEffect, useCallback, RefObject } from 'react';

interface DocumentWithFullscreen extends Document {
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

function isDocumentInFullscreen(doc: DocumentWithFullscreen): boolean {
  return !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
}

export function useFullscreen(ref?: RefObject<HTMLElementWithFullscreen>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const getElement = useCallback(() => {
    return ref?.current || document.documentElement as HTMLElementWithFullscreen;
  }, [ref]);

  const handleFullscreenChange = useCallback(() => {
    const doc = document as DocumentWithFullscreen;
    setIsFullscreen(isDocumentInFullscreen(doc));
  }, []);

  useEffect(() => {
    const element = getElement();
    const supported = !!(
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen
    );
    setIsSupported(supported);
    
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
  }, [getElement, handleFullscreenChange]);
  
  const toggleFullscreen = useCallback(() => {
    const doc = document as DocumentWithFullscreen;
    const element = getElement();

    if (!isDocumentInFullscreen(doc)) {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen().catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  }, [getElement]);

  return { isFullscreen, toggleFullscreen, isSupported };
}
