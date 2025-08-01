"use client";

import React from 'react';
import { Trash2, GripVertical, Bold, Italic, Underline } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

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
}

export function AnnotationComponent({ annotation, isSelected, onSelect, onDelete, updateAnnotation }: AnnotationComponentProps) {
    const { id, x, y, width, height, type } = annotation;
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
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
            {isSelected && (
                <>
                    {type === 'text' && (
                        <>
                            <div onMouseDown={handleMouseDown} style={{ position: 'absolute', top: '50%', left: -20, transform: 'translateY(-50%)', cursor: 'grab', zIndex: 21 }}>
                                <GripVertical size={16} />
                            </div>
                            <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', backgroundColor: 'white', padding: '4px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 21 }}>
                                <Button variant="outline" size="icon" onClick={() => updateAnnotation({ ...annotation, isBold: !annotation.isBold })}>
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => updateAnnotation({ ...annotation, isItalic: !annotation.isItalic })}>
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => updateAnnotation({ ...annotation, isUnderline: !annotation.isUnderline })}>
                                    <Underline className="h-4 w-4" />
                                </Button>
                                <select
                                    onChange={(e) => updateAnnotation({ ...annotation, fontSize: parseInt(e.target.value) })}
                                    value={annotation.fontSize}
                                    className="bg-background border border-input rounded-md px-2 py-1 text-sm"
                                >
                                    <option value="12">12px</option>
                                    <option value="14">14px</option>
                                    <option value="16">16px</option>
                                    <option value="20">20px</option>
                                </select>
                            </div>
                        </>
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
                    contentEditable={isSelected}
                    suppressContentEditableWarning={true}
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
            {type === 'image' && (
                 <Image src={annotation.dataUrl} layout="fill" objectFit="contain" alt="annotation" />
            )}
        </div>
    );
}
