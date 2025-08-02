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
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const dragStartRef = React.useRef({ x: 0, y: 0 });
    const originalAnnotationRef = React.useRef<Annotation | null>(null);
    const textRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent, isResize: boolean = false) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        onSelect(id);

        if(isResize) {
            setIsResizing(true);
        } else {
            setIsDragging(true);
        }

        dragStartRef.current = { x: e.clientX, y: e.clientY };
        originalAnnotationRef.current = annotation;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            if (isResize) {
                updateAnnotation({ ...originalAnnotationRef.current!, width: originalAnnotationRef.current!.width + dx, height: originalAnnotationRef.current!.height + dy }, false);
            } else {
                updateAnnotation({ ...originalAnnotationRef.current!, x: originalAnnotationRef.current!.x + dx, y: originalAnnotationRef.current!.y + dy }, false);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            if (isResize) {
                updateAnnotation({ ...originalAnnotationRef.current!, width: originalAnnotationRef.current!.width + dx, height: originalAnnotationRef.current!.height + dy }, true);
            } else {
                updateAnnotation({ ...originalAnnotationRef.current!, x: originalAnnotationRef.current!.x + dx, y: originalAnnotationRef.current!.y + dy }, true);
            }

            setIsDragging(false);
            setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    React.useEffect(() => {
        if (isSelected && textRef.current) {
            textRef.current.focus();
        }
    }, [isSelected]);

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
        cursor: isDragging ? 'grabbing' : (activeTool === 'select' ? 'grab' : 'default'),
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
            {type === 'text' && (
                <div
                    ref={textRef}
                    contentEditable={isSelected && activeTool === 'select'}
                    suppressContentEditableWarning={true}
                    onMouseDown={(e) => {
                        if (activeTool !== 'select') return;
                        onSelect(id);
                        e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === ' ') {
                            e.stopPropagation();
                        }
                    }}
                    onInput={(e) => updateAnnotation({ ...annotation, text: e.currentTarget.innerText }, false)}
                    onBlur={(e) => updateAnnotation({ ...annotation, text: e.currentTarget.innerText }, true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        fontWeight: annotation.isBold ? 'bold' : 'normal',
                        fontStyle: annotation.isItalic ? 'italic' : 'normal',
                        textDecoration: annotation.isUnderline ? 'underline' : 'none',
                        fontSize: `${annotation.fontSize}px`,
                    }}
                >
                    {annotation.text}
                </div>
            )}
            {(type === 'image' || type === 'signature') && (annotation as ImageAnnotation | SignatureAnnotation).dataUrl && (
                 <Image src={annotation.dataUrl} layout="fill" objectFit="contain" alt="annotation" />
            )}
        </div>
    );
}
