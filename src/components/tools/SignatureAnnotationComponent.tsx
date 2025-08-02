"use client";

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import Image from 'next/image';

// Using the same types from PdfEditor.tsx
type ImageAnnotation = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'image';
  dataUrl: string;
};

interface SignatureAnnotationComponentProps {
    annotation: ImageAnnotation;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    updateAnnotation: (annotation: ImageAnnotation) => void;
    activeTool: 'text' | 'image' | 'signature' | 'select' | null;
}

export function SignatureAnnotationComponent({ annotation, isSelected, onSelect, onDelete, updateAnnotation, activeTool }: SignatureAnnotationComponentProps) {
    const { id, x, y, width, height, type } = annotation;
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const annotationRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        onSelect(id);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

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
            ref={annotationRef}
            className="annotation-component"
            style={componentStyle}
            onMouseDown={handleMouseDown}
        >
            {isSelected && activeTool === 'select' && (
                <>
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
            {annotation.dataUrl && (
                 <Image src={annotation.dataUrl} layout="fill" objectFit="contain" alt="annotation" />
            )}
        </div>
    );
}
