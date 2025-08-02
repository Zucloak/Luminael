"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

declare const Desmos: any;

export function Calculator() {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const { isHellBound } = useTheme();
  const calculatorInstance = useRef<any>(null);

  useEffect(() => {
    if (calculatorRef.current && typeof Desmos !== 'undefined') {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
      }

      const options = {
        keypad: true,
        expressions: false,
        settingsMenu: false,
        invertedColors: isHellBound,
        fontSize: 18,
        projectorMode: false,
      };

      if (Desmos.enabledFeatures.ScientificCalculator) {
        calculatorInstance.current = Desmos.ScientificCalculator(calculatorRef.current, options);
      } else {
        console.error("Desmos Scientific Calculator is not enabled for this API key.");
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
    <Card className="w-full max-w-sm mx-auto shadow-lg border-0 desmos-container">
      <CardHeader>
        <CardTitle>Scientific Calculator</CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription>A powerful scientific calculator.</CardDescription>
          <span className="text-xs text-muted-foreground desmos-powered-by">
            Powered by Desmos
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div ref={calculatorRef} style={{ width: '100%', height: '450px' }}></div>
      </CardContent>
    </Card>
  );
}
