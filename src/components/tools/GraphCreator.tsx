"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/hooks/use-theme';

declare const Desmos: any;

interface FunctionInput {
  id: string;
  latex: string;
  color: string;
}

const generateColor = () => {
  const colors = ['#c74440', '#2d70b3', '#388c46', '#6042a6', '#fa7e19', '#000000'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function GraphCreator() {
  const graphRef = useRef<HTMLDivElement>(null);
  const calculatorInstance = useRef<any>(null);
  const { isHellBound } = useTheme();

  const [functions, setFunctions] = useState<FunctionInput[]>([
    { id: 'graph1', latex: 'y=\\sin(x)', color: '#c74440' },
    { id: 'graph2', latex: 'y=\\cos(x)', color: '#2d70b3' },
  ]);

  useEffect(() => {
    if (graphRef.current && typeof Desmos !== 'undefined') {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
      }

      const options = {
        expressions: false,
        settingsMenu: true,
        invertedColors: isHellBound,
        keypad: true,
        projectorMode: false,
      };

      if (Desmos.enabledFeatures.GraphingCalculator) {
        const calculator = Desmos.GraphingCalculator(graphRef.current, options);
        functions.forEach(f => calculator.setExpression(f));
        calculatorInstance.current = calculator;
      } else {
        console.error("Desmos Graphing Calculator is not enabled for this API key.");
      }
    }

    return () => {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
        calculatorInstance.current = null;
      }
    };
  }, [isHellBound, functions]);

  useEffect(() => {
    if (calculatorInstance.current) {
      // First, clear all existing expressions from the graph
      const currentExpressions = calculatorInstance.current.getExpressions();
      currentExpressions.forEach((expr: any) => calculatorInstance.current.removeExpression({id: expr.id}));

      // Then, add the current set of functions
      functions.forEach(f => {
        if(f.latex.trim() !== '') {
          calculatorInstance.current.setExpression({ ...f, id: f.id });
        }
      });
    }
  }, [functions, isHellBound]);

  const handleFunctionChange = (id: string, value: string) => {
    setFunctions(functions.map(f => f.id === id ? { ...f, latex: value } : f));
  };

  const addFunction = () => {
    const newId = `graph${Date.now()}`;
    setFunctions([...functions, { id: newId, latex: '', color: generateColor() }]);
  };

  const removeFunction = (id: string) => {
    setFunctions(functions.filter(f => f.id !== id));
    if (calculatorInstance.current) {
      calculatorInstance.current.removeExpression({ id });
    }
  };

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Interactive Graph Creator</CardTitle>
        <div className="flex items-center justify-between">
            <CardDescription>Enter functions to plot. Pan and zoom on the graph.</CardDescription>
            <span className="text-xs text-muted-foreground">(Powered by Desmos)</span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div ref={graphRef} className="w-full h-[400px] border rounded-md"></div>
        </div>

        <div className="space-y-3">
          <Label>Functions</Label>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
            {functions.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: f.color }}></div>
                <Input
                  type="text"
                  placeholder="e.g., x^2, sin(x)"
                  value={f.latex}
                  onChange={(e) => handleFunctionChange(f.id, e.target.value)}
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
        </div>
      </CardContent>
    </Card>
  );
}
