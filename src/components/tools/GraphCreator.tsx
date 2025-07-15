"use client";

import React, { useEffect, useRef, useState } from 'react';
import JXG from 'jsxgraph';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Trash2, Eraser } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define a type for a single function input
interface FunctionInput {
  id: number;
  funcStr: string;
  color: string;
  error: string | null;
}

// Generate a random color for new functions
const generateColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export function GraphCreator() {
  const boardRef = useRef<JXG.Board | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [functions, setFunctions] = useState<FunctionInput[]>([
    { id: 1, funcStr: 'sin(x)', color: '#3b82f6', error: null },
    { id: 2, funcStr: 'cos(x)', color: '#ef4444', error: null },
  ]);
  const [userPoints, setUserPoints] = useState<JXG.Point[]>([]);

  // Initialize board
  useEffect(() => {
    if (containerRef.current && !boardRef.current) {
      const board = JXG.JSXGraph.initBoard(containerRef.current.id, {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true, needShift: false },
        zoom: { factorX: 1.25, factorY: 1.25, wheel: true, needShift: false }
      });

      // Add click event handler to create points
      board.on('down', (e: any) => {
        if (e.button === 0) { // Only on left click
            const coords = board.getUsrCoordsOfMouse(e);
            const point = board.create('point', [coords[0], coords[1]], {
                name: `(${coords[0].toFixed(2)}, ${coords[1].toFixed(2)})`,
                size: 3,
                face: 'o',
                color: '#84cc16' // A distinct lime green color
            });
            setUserPoints(prevPoints => [...prevPoints, point]);
        }
      });

      boardRef.current = board;
    }
    return () => {
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };
  }, []);

  const clearUserPoints = () => {
    const board = boardRef.current;
    if (board) {
      board.suspendUpdate();
      userPoints.forEach(p => board.removeObject(p));
      board.unsuspendUpdate();
      setUserPoints([]);
    }
  };

  // Update plots when functions change
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    board.suspendUpdate();
    // Clear all previous objects on the board
    const allObjects = Object.values(board.objects as Record<string, JXG.GeometryElement>);
    for (const el of allObjects) {
      board.removeObject(el);
    }
    // Re-draw axes
    board.create('axis', [[0, 0], [1, 0]]);
    board.create('axis', [[0, 0], [0, 1]]);

    // Plot each function
    setFunctions(currentFunctions =>
      currentFunctions.map(f => {
        let newError = null;
        if (f.funcStr.trim() !== '') {
          try {
            // This simple evaluation is for demonstration. A robust parser is needed for complex expressions.
            board.create('functiongraph', [f.funcStr], { strokeColor: f.color, strokeWidth: 2 });
          } catch (e: any) {
            newError = `Invalid function: "${f.funcStr}"`;
          }
        }
        return { ...f, error: newError };
      })
    );

    board.unsuspendUpdate();
  }, [functions.map(f => f.funcStr).join()]); // Dependency array on function strings

  const handleFunctionChange = (id: number, value: string) => {
    setFunctions(functions.map(f => f.id === id ? { ...f, funcStr: value } : f));
  };

  const addFunction = () => {
    setFunctions([...functions, { id: Date.now(), funcStr: '', color: generateColor(), error: null }]);
  };

  const removeFunction = (id: number) => {
    setFunctions(functions.filter(f => f.id !== id));
  };

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Interactive Graph Creator</CardTitle>
        <CardDescription>Enter one or more functions to plot. Pan with your mouse and zoom with your scroll wheel.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div
              id="jsxbox"
              ref={containerRef}
              className="jxgbox w-full h-[400px] border rounded-md"
          ></div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Functions</Label>
            <Button onClick={clearUserPoints} variant="ghost" size="sm" disabled={userPoints.length === 0}>
                <Eraser className="mr-2 h-4 w-4" /> Clear Points
            </Button>
          </div>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
            {functions.map((f, index) => (
              <div key={f.id} className="flex items-center gap-2">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: f.color }}></div>
                <Input
                    type="text"
                    placeholder="e.g., x^2, sin(x)"
                    value={f.funcStr}
                    onChange={(e) => handleFunctionChange(f.id, e.target.value)}
                    className={f.error ? 'border-destructive' : ''}
                />
                <Button variant="ghost" size="icon" onClick={() => removeFunction(f.id)} disabled={functions.length <= 1}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={addFunction} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Function
          </Button>
          <div className="pt-2">
            {functions.map(f => f.error && (
                <Alert key={f.id} variant="destructive" className="text-xs p-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{f.error}</AlertDescription>
                </Alert>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
