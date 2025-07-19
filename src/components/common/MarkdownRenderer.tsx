'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  // Diagnostic log to see what children are passed, especially for problematic cases
  if (typeof children === 'string' && (children.includes("\\frac{kQ}{r}") || children.includes("\\rho(r')"))) {
    console.log("[MarkdownRenderer] Received children for rendering:", JSON.stringify(children));
  }

  return (
    <div className={cn("markdown-renderer-wrapper", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
