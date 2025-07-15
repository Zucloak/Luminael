"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [isScientific, setIsScientific] = useState(false);

  const handleInput = (value: string) => {
    if (display === 'Error' || display === 'NaN') {
      setDisplay(value);
      return;
    }
    setDisplay(display === '0' ? value : display + value);
  };

  const handleOperator = (op: string) => {
    if (display === 'Error' || display === 'NaN') return;
    const lastChar = display.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
      setDisplay(display.slice(0, -1) + op);
    } else {
      setDisplay(display + op);
    }
  };

  const handleClear = () => setDisplay('0');
  const handleBackspace = () => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');

  const handleCalculate = () => {
    try {
      // Replace user-friendly symbols with mathjs-compatible ones
      const expression = display.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      const result = evaluate(expression);
      setDisplay(format(result, { precision: 14 }));
    } catch (error) {
      setDisplay('Error');
    }
  };

  const handleScientificFunc = (func: string) => {
    if (display === 'Error' || display === 'NaN') {
      setDisplay(`${func}(`);
    } else if (display === '0') {
      setDisplay(`${func}(`);
    } else {
      // This is a simple implementation. A more advanced one would parse the expression.
      setDisplay(`${func}(${display})`);
    }
  };

  // Base classes for different button types
  const btnBase = "h-12 text-lg rounded-md";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80`;
  const btnOp = `${btnBase} bg-primary/20 hover:bg-primary/30 text-primary`;
  const btnFunc = `${btnBase} bg-secondary hover:bg-secondary/80`;

  return (
    <Card className="w-full max-w-sm mx-auto shadow-md border-0 bg-background">
      <CardContent className="p-2">
        <div className="bg-muted text-muted-foreground rounded-lg p-4 mb-4 text-right text-4xl font-mono break-all h-20 flex items-center justify-end">
          {display}
        </div>

        <div className="flex justify-end items-center gap-2 mb-2 pr-1">
            <Label htmlFor="scientific-mode" className="text-xs">Scientific</Label>
            <Switch id="scientific-mode" checked={isScientific} onCheckedChange={setIsScientific} />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {/* Scientific Buttons - conditionally rendered */}
          {isScientific && (
            <>
              <Button onClick={() => handleScientificFunc('sin')} className={btnFunc}>sin</Button>
              <Button onClick={() => handleScientificFunc('cos')} className={btnFunc}>cos</Button>
              <Button onClick={() => handleScientificFunc('tan')} className={btnFunc}>tan</Button>
              <Button onClick={() => handleInput('^')} className={btnFunc}>x^y</Button>
              <Button onClick={handleBackspace} className={`${btnFunc} text-destructive`}>⌫</Button>

              <Button onClick={() => handleScientificFunc('log')} className={btnFunc}>log</Button>
              <Button onClick={() => handleScientificFunc('sqrt')} className={btnFunc}>√</Button>
              <Button onClick={() => handleInput('(')} className={btnFunc}>(</Button>
              <Button onClick={() => handleInput(')')} className={btnFunc}>)</Button>
              <Button onClick={() => handleOperator('%')} className={btnFunc}>%</Button>
            </>
          )}

          {/* Standard Buttons */}
          <Button onClick={handleClear} className={`${btnFunc} ${isScientific ? 'col-span-2' : 'col-span-3'} text-destructive`}>C</Button>
          {!isScientific && <Button onClick={handleBackspace} className={`${btnFunc} text-destructive`}>⌫</Button>}
          <Button onClick={() => handleOperator('/')} className={`${btnOp} ${isScientific ? 'col-span-3' : ''}`}>÷</Button>

          <Button onClick={() => handleInput('7')} className={btnNum}>7</Button>
          <Button onClick={() => handleInput('8')} className={btnNum}>8</Button>
          <Button onClick={() => handleInput('9')} className={btnNum}>9</Button>
          <Button onClick={() => handleOperator('*')} className={btnOp}>×</Button>
          {isScientific && <Button onClick={() => handleInput('pi')} className={btnFunc}>π</Button>}

          <Button onClick={() => handleInput('4')} className={btnNum}>4</Button>
          <Button onClick={() => handleInput('5')} className={btnNum}>5</Button>
          <Button onClick={() => handleInput('6')} className={btnNum}>6</Button>
          <Button onClick={() => handleOperator('-')} className={btnOp}>−</Button>
          {isScientific && <Button onClick={() => handleInput('e')} className={btnFunc}>e</Button>}

          <Button onClick={() => handleInput('1')} className={btnNum}>1</Button>
          <Button onClick={() => handleInput('2')} className={btnNum}>2</Button>
          <Button onClick={() => handleInput('3')} className={btnNum}>3</Button>
          <Button onClick={() => handleOperator('+')} className={btnOp}>+</Button>
          {isScientific && <div className="row-span-2"><Button onClick={handleCalculate} className={`${btnOp} w-full h-full`}>=</Button></div>}

          <Button onClick={() => handleInput('0')} className={`${btnNum} col-span-2`}>0</Button>
          <Button onClick={() => handleInput('.')} className={btnNum}>.</Button>
          {!isScientific && <Button onClick={handleCalculate} className={`${btnOp} col-span-2`}>=</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
