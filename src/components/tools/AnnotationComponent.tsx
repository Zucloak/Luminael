"use client";

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import Image from 'next/image';

// Using the same types from PdfEditor.tsx
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
  color: { r: number; g: number; b: number; };
};

type ImageAnnotation = AnnotationBase & {
  type: 'image';
  dataUrl: string;
};

type SignatureAnnotation = AnnotationBase & {
    type: 'signature';
    dataUrl: string;
};

type Annotation = TextAnnotation | ImageAnnotation | SignatureAnnotation;

interface AnnotationComponentProps {
    annotation: Annotation;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    updateAnnotation: (annotation: Annotation, addToHistory?: boolean) => void;
    activeTool: 'text' | 'image' | 'signature' | 'select' | null;
}

export function AnnotationComponent({ annotation, isSelected, onSelect, onDelete, updateAnnotation, activeTool }: AnnotationComponentProps) {
    const { id, x, y, width, height, type } = annotation;

    const handleMouseDown = (e: React.MouseEvent, isResize: boolean = false) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        onSelect(id);

        const startX = e.clientX;
        const startY = e.clientY;
        const originalAnnotation = { ...annotation };

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let updatedAnnotation: Annotation;
            if (isResize) {
                updatedAnnotation = { ...originalAnnotation, width: originalAnnotation.width + dx, height: originalAnnotation.height + dy };
            } else {
                updatedAnnotation = { ...originalAnnotation, x: originalAnnotation.x + dx, y: originalAnnotation.y + dy };
            }
            updateAnnotation(updatedAnnotation, false); // Replace state without adding to history
        };

        const handleMouseUp = (e: MouseEvent) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let finalAnnotation: Annotation;
            if (isResize) {
                finalAnnotation = { ...originalAnnotation, width: originalAnnotation.width + dx, height: originalAnnotation.height + dy };
            } else {
                finalAnnotation = { ...originalAnnotation, x: originalAnnotation.x + dx, y: originalAnnotation.y + dy };
            }
            updateAnnotation(finalAnnotation, true); // Set state and add to history

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };


    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(id);
    };

    const componentStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
        cursor: (activeTool === 'select' ? 'grab' : 'default'),
    };

    return (
        <div
            className="annotation-component"
            style={componentStyle}
            onMouseDown={(type === 'image' || type === 'signature') ? (e) => handleMouseDown(e, false) : undefined}
        >
            {isSelected && activeTool === 'select' && (
                <>
                    {type === 'text' && (
                        <div onMouseDown={(e) => handleMouseDown(e, false)} style={{ position: 'absolute', top: '50%', left: -20, transform: 'translateY(-50%)', cursor: 'grab', zIndex: 21 }}>
                            <GripVertical size={16} />
                        </div>
                    )}
                    <button
                        onClick={handleDelete}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 z-20"
                        style={{ cursor: 'pointer' }}
                    >
                        <Trash2 size={12} />
                    </button>
                    <div onMouseDown={(e) => handleMouseDown(e, true)} style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, backgroundColor: '#3b82f6', cursor: 'nwse-resize', zIndex: 21 }} />
                </>
            )}
            {type === 'text' && isSelected ? (
                <textarea
                    autoFocus
                    value={annotation.text}
                    onChange={(e) => updateAnnotation({ ...annotation, text: e.target.value }, false)}
                    onBlur={() => updateAnnotation(annotation, true)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute w-full h-full bg-transparent border-0 resize-none focus:outline-none focus:ring-0"
                    style={{
                        padding: 0,
                        margin: 0,
                        fontWeight: annotation.isBold ? 'bold' : 'normal',
                        fontStyle: annotation.isItalic ? 'italic' : 'normal',
                        textDecoration: annotation.isUnderline ? 'underline' : 'none',
                        fontSize: `${annotation.fontSize}px`,
                        color: `rgb(${annotation.color.r * 255}, ${annotation.color.g * 255}, ${annotation.color.b * 255})`,
                    }}
                />
            ) : type === 'text' ? (
                <div
                    className="w-full h-full"
                    style={{
                        fontWeight: annotation.isBold ? 'bold' : 'normal',
                        fontStyle: annotation.isItalic ? 'italic' : 'normal',
                        textDecoration: annotation.isUnderline ? 'underline' : 'none',
                        fontSize: `${annotation.fontSize}px`,
                        color: `rgb(${annotation.color.r * 255}, ${annotation.color.g * 255}, ${annotation.color.b * 255})`,
                    }}
                >
                    {annotation.text}
                </div>
            ) : null}
            {(type === 'image' || type === 'signature') && (annotation as ImageAnnotation | SignatureAnnotation).dataUrl && (
                 <Image src={annotation.dataUrl} layout="fill" objectFit="contain" alt="annotation" />
            )}
        </div>
    );
}
