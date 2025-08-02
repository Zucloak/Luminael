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

type Annotation = TextAnnotation | ImageAnnotation;

interface AnnotationComponentProps {
    annotation: Annotation;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    updateAnnotation: (annotation: Annotation) => void;
    activeTool: 'text' | 'image' | 'signature' | 'select' | null;
}

export function AnnotationComponent({ annotation, isSelected, onSelect, onDelete, updateAnnotation, activeTool }: AnnotationComponentProps) {
    const { id, x, y, width, height, type } = annotation;
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const textRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        // e.stopPropagation(); // This was causing issues with text selection
        onSelect(id);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    React.useEffect(() => {
        if (isSelected && textRef.current) {
            textRef.current.focus();
        }
    }, [isSelected]);

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                updateAnnotation({ ...annotation, x: annotation.x + dx, y: annotation.y + dy });
                setDragStart({ x: e.clientX, y: e.clientY });
            } else if (isResizing) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                updateAnnotation({ ...annotation, width: annotation.width + dx, height: annotation.height + dy });
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, annotation, updateAnnotation]);

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
        cursor: isDragging ? 'grabbing' : 'move',
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    return (
        <div
            className="annotation-component"
            style={componentStyle}
            onMouseDown={type === 'image' ? handleMouseDown : undefined}
        >
            {isSelected && activeTool === 'select' && (
                <>
                    {type === 'text' && (
                        <div onMouseDown={handleMouseDown} style={{ position: 'absolute', top: '50%', left: -20, transform: 'translateY(-50%)', cursor: 'grab', zIndex: 21 }}>
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
                    <div onMouseDown={(e) => handleResizeMouseDown(e)} style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, backgroundColor: '#3b82f6', cursor: 'nwse-resize', zIndex: 21 }} />
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
                    onBlur={(e) => updateAnnotation({ ...annotation, text: e.currentTarget.innerText })}
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
            {type === 'image' && (annotation as ImageAnnotation).dataUrl && (
                 <Image src={annotation.dataUrl} layout="fill" objectFit="contain" alt="annotation" />
            )}
        </div>
    );
}
