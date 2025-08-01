import React, { useState, useEffect, useRef } from 'react';

// Assuming types are defined in a shared file, e.g., './types'
// For this example, I'll redefine them.
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
  color: string;
};

type ImageAnnotation = AnnotationBase & {
  type: 'image';
  dataUrl: string;
};

type Annotation = TextAnnotation | ImageAnnotation;

interface AnnotationComponentProps {
    annotation: Annotation;
    onUpdate: (id: string, updates: Partial<Annotation>) => void;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
}

interface AnnotationComponentProps {
    annotation: Annotation;
    onUpdate: (id: string, updates: Partial<Annotation>) => void;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
}

export const AnnotationComponent: React.FC<AnnotationComponentProps> = ({ annotation, onUpdate, isSelected, onSelect, onDragStart }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isSelected) {
            onSelect(e);
        }
        e.stopPropagation();
        onDragStart(e, annotation.id);
    };

    useEffect(() => {
        if (isSelected && annotation.type === 'text' && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isSelected, annotation.type]);


    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate(annotation.id, { text: e.target.value });
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const componentStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${annotation.x}px`,
        top: `${annotation.y}px`,
        width: `${annotation.width}px`,
        border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
        cursor: 'grab',
        transition: 'border-color 0.2s',
    };

    if (annotation.type === 'text') {
        Object.assign(componentStyle, {
            fontWeight: annotation.isBold ? 'bold' : 'normal',
            fontStyle: annotation.isItalic ? 'italic' : 'normal',
            textDecoration: annotation.isUnderline ? 'underline' : 'none',
            fontSize: `${annotation.fontSize}px`,
            fontFamily: annotation.fontFamily,
            color: annotation.color,
            minHeight: `${annotation.height}px`,
        });
    }

    if (annotation.type === 'text' && isSelected) {
        return (
            <div style={componentStyle}>
                <textarea
                    ref={textareaRef}
                    value={annotation.text}
                    onChange={handleTextChange}
                    onMouseDown={(e) => {
                        onSelect(e);
                        e.stopPropagation();
                    }}
                    className="w-full h-full bg-transparent resize-none border-none focus:outline-none p-0"
                    style={{
                        fontWeight: 'inherit',
                        fontStyle: 'inherit',
                        textDecoration: 'inherit',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        color: 'inherit',
                    }}
                />
            </div>
        )
    }

    return (
        <div style={componentStyle} onMouseDown={handleMouseDown}>
            {annotation.type === 'text' ? (
                <div className="w-full h-full whitespace-pre-wrap break-words">{annotation.text}</div>
            ) : (
                <img src={annotation.dataUrl} alt="annotation" className="w-full h-full" draggable={false} />
            )}
        </div>
    );
};
