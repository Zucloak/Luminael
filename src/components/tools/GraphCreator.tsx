"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

declare const Desmos: any;

export function GraphCreator() {
  const graphRef = useRef<HTMLDivElement>(null);
  const calculatorInstance = useRef<any>(null);
  const { isHellBound } = useTheme();

  useEffect(() => {
    if (graphRef.current && typeof Desmos !== 'undefined') {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
      }

      const options = {
        expressions: true, // Use Desmos's native expression list
        settingsMenu: true,
        invertedColors: isHellBound,
        keypad: true,
        projectorMode: false,
      };

      if (Desmos.enabledFeatures.GraphingCalculator) {
        const calculator = Desmos.GraphingCalculator(graphRef.current, options);

        // You can set initial expressions here if needed
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

  return (
    <Card className="w-full border-0 desmos-container">
      <CardHeader>
        <CardTitle>Interactive Graph Creator</CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription>Use the expression list to plot functions.</CardDescription>
          <span className="text-xs text-muted-foreground desmos-powered-by">
            Powered by Desmos
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={graphRef} className="w-full h-[500px] border rounded-md"></div>
      </CardContent>
    </Card>
  );
}
