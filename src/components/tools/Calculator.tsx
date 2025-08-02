"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

// It's important to declare the Desmos global object to TypeScript
declare const Desmos: any;

export function Calculator() {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const { isHellBound } = useTheme();
  const calculatorInstance = useRef<any>(null);

  useEffect(() => {
    if (calculatorRef.current && typeof Desmos !== 'undefined') {
      // If a calculator instance already exists, destroy it before creating a new one
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

      // Ensure the 'ScientificCalculator' feature is enabled
      if (Desmos.enabledFeatures.ScientificCalculator) {
        calculatorInstance.current = Desmos.ScientificCalculator(calculatorRef.current, options);
      } else {
        console.error("Desmos Scientific Calculator is not enabled for this API key.");
      }
    }

    // Cleanup function to destroy the calculator instance when the component unmounts
    return () => {
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
        calculatorInstance.current = null;
      }
    };
  }, [isHellBound]); // Re-initialize when the theme changes

  return (
    <Card className="w-full max-w-xs mx-auto shadow-lg border-0 bg-background">
      <CardContent className="p-2 space-y-2">
        <div ref={calculatorRef} style={{ width: '100%', height: '400px' }}></div>
        <div className="text-center text-xs text-muted-foreground">
          (Powered by Desmos)
        </div>
      </CardContent>
    </Card>
  );
}
