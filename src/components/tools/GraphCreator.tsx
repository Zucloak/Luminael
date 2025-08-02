"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useFullscreen } from '@/hooks/use-fullscreen';

declare const Desmos: any;

export function GraphCreator() {
  const graphRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const calculatorInstance = useRef<any>(null);
  const { isHellBound } = useTheme();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(fullscreenRef);

  useEffect(() => {
    if (graphRef.current && typeof Desmos !== 'undefined') {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
      }

      const options = {
        expressions: true,
        settingsMenu: true,
        invertedColors: isHellBound,
        keypad: true,
        projectorMode: false,
      };

      if (Desmos.enabledFeatures.GraphingCalculator) {
        const calculator = Desmos.GraphingCalculator(graphRef.current, options);
        calculator.setExpression({ id: 'graph1', latex: 'y=x^2' });
        calculator.setExpression({ id: 'graph2', latex: 'y=\\sin(x)' });
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
  }, [isHellBound]);

  // Resize the calculator when entering/exiting fullscreen
  useEffect(() => {
    if (calculatorInstance.current) {
      calculatorInstance.current.resize();
    }
  }, [isFullscreen]);

  return (
    <Card className="w-full border-0 desmos-container">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Interactive Graph Creator</CardTitle>
          {isSupported && (
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <CardDescription>Use the expression list to plot functions.</CardDescription>
          <span className="text-xs text-muted-foreground desmos-powered-by">
            Powered by Desmos
          </span>
        </div>
      </CardHeader>
      <CardContent ref={fullscreenRef} className="bg-background">
        <div
          ref={graphRef}
          className="w-full border rounded-md"
          style={{ height: isFullscreen ? '100vh' : '500px' }}
        ></div>
      </CardContent>
    </Card>
  );
}
