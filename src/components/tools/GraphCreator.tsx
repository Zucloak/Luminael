"use client";

import React, { useEffect, useRef, useState } from 'react';
import JXG from 'jsxgraph';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GraphCreator() {
  const boardRef = useRef<JXG.Board | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fnInput, setFnInput] = useState('sin(x)');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize board only once
    if (containerRef.current && !boardRef.current) {
      // JXG.Options.infobox.fontSize = 0; // Disable info box
      boardRef.current = JXG.JSXGraph.initBoard(containerRef.current.id, {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        showCopyright: false,
        showNavigation: true,
        pan: {
            enabled: true,
            needShift: false,
        },
        zoom: {
            factorX: 1.25,
            factorY: 1.25,
            wheel: true,
            needShift: false,
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    // Clear previous plots
    board.suspendUpdate();
    // Use Object.values and a type assertion for a type-safe iteration
    const allObjects = Object.values(board.objects as Record<string, JXG.GeometryElement>);
    for (const el of allObjects) {
        board.removeObject(el);
    }
    // Re-draw axis after clearing
     board.create('axis', [[0, 0], [1, 0]]);
     board.create('axis', [[0, 0], [0, 1]]);

    try {
      if (fnInput.trim() !== '') {
        board.create('functiongraph', [function(x: number) {
          try {
            // A bit of a hack to evaluate functions like sin(x), x^2, etc.
            // This is NOT safe for complex user input but works for simple functions.
            // A proper parser would be needed for production.
            const scope = { x: x, sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log };
            const compiled = new Function('scope', `with(scope) { return ${fnInput} }`);
            return compiled(scope);
          } catch (e) {
            return NaN;
          }
        }]);
      }
      setError(null);
    } catch (e: any) {
      setError(`Invalid function: ${e.message}`);
    } finally {
      board.unsuspendUpdate();
    }
  }, [fnInput]);

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Interactive Graph Creator</CardTitle>
        <CardDescription>Enter a function to plot it on the graph. Pan with your mouse and zoom with your scroll wheel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
            id="jsxbox"
            ref={containerRef}
            className="jxgbox w-full h-[400px] border rounded-md"
            style={{ backgroundColor: 'var(--card-background)' }}
        ></div>

        <div className="space-y-2">
            <Label htmlFor="function-input">Function f(x):</Label>
            <Input
                id="function-input"
                type="text"
                placeholder="e.g., x^2, sin(x), 2*x + 1"
                value={fnInput}
                onChange={(e) => setFnInput(e.target.value)}
            />
        </div>
        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
