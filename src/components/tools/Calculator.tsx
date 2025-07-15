"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate } from 'mathjs';

const buttonClasses = "h-14 text-xl font-semibold rounded-md";
const operatorButtonClasses = `${buttonClasses} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
const functionButtonClasses = `${buttonClasses} bg-muted text-muted-foreground hover:bg-muted/80`;

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [isScientific, setIsScientific] = useState(false);

  const handleInput = (value: string) => {
    if (display === 'Error') {
      setDisplay(value);
      return;
    }
    setDisplay(display === '0' ? value : display + value);
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    // Avoid multiple operators in a row
    if (/[+\-*/.]$/.test(display)) {
      setDisplay(display.slice(0, -1) + op);
    } else {
      setDisplay(display + op);
    }
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (display === 'Error' || display.length === 1) {
        setDisplay('0');
    } else {
        setDisplay(display.slice(0, -1));
    }
  }

  const handleCalculate = () => {
    try {
      const result = evaluate(display.replace(/%/g, '/100')); // Handle percentage
      setDisplay(String(result));
    } catch (error) {
      setDisplay('Error');
    }
  };

  const handleScientificFunc = (func: string) => {
    if (display === 'Error') return;
    // If display is 0, start new, else wrap existing
    const currentVal = (display === '0') ? '' : display;
    setDisplay(`${func}(${currentVal})`);
  };

  const buttons = [
    { label: 'C', handler: handleClear, className: functionButtonClasses },
    { label: '(', handler: () => handleInput('('), className: functionButtonClasses },
    { label: ')', handler: () => handleInput(')'), className: functionButtonClasses },
    { label: '÷', handler: () => handleOperator('/'), className: operatorButtonClasses },
    { label: '7', handler: () => handleInput('7'), className: buttonClasses },
    { label: '8', handler: () => handleInput('8'), className: buttonClasses },
    { label: '9', handler: () => handleInput('9'), className: buttonClasses },
    { label: '×', handler: () => handleOperator('*'), className: operatorButtonClasses },
    { label: '4', handler: () => handleInput('4'), className: buttonClasses },
    { label: '5', handler: () => handleInput('5'), className: buttonClasses },
    { label: '6', handler: () => handleInput('6'), className: buttonClasses },
    { label: '−', handler: () => handleOperator('-'), className: operatorButtonClasses },
    { label: '1', handler: () => handleInput('1'), className: buttonClasses },
    { label: '2', handler: () => handleInput('2'), className: buttonClasses },
    { label: '3', handler: () => handleInput('3'), className: buttonClasses },
    { label: '+', handler: () => handleOperator('+'), className: operatorButtonClasses },
    { label: '0', handler: () => handleInput('0'), className: `${buttonClasses} col-span-2` },
    { label: '.', handler: () => handleOperator('.'), className: buttonClasses },
    { label: '=', handler: handleCalculate, className: operatorButtonClasses },
  ];

  const scientificButtons = [
    { label: 'sin', handler: () => handleScientificFunc('sin'), className: functionButtonClasses },
    { label: 'cos', handler: () => handleScientificFunc('cos'), className: functionButtonClasses },
    { label: 'tan', handler: () => handleScientificFunc('tan'), className: functionButtonClasses },
    { label: 'log', handler: () => handleScientificFunc('log10'), className: functionButtonClasses },
    { label: 'ln', handler: () => handleScientificFunc('log'), className: functionButtonClasses },
    { label: '√', handler: () => handleScientificFunc('sqrt'), className: functionButtonClasses },
    { label: 'x²', handler: () => handleInput('^2'), className: functionButtonClasses },
    { label: 'π', handler: () => handleInput('pi'), className: functionButtonClasses },
    { label: '%', handler: () => handleOperator('%'), className: functionButtonClasses },
    { label: '⌫', handler: handleBackspace, className: functionButtonClasses },
  ];

  return (
    <Card className="w-full max-w-sm mx-auto shadow-md border-0">
      <CardContent className="p-4">
        <div className="bg-muted text-muted-foreground rounded-lg p-4 mb-4 text-right text-4xl font-mono break-all">
          {display}
        </div>
        <div className="flex justify-end mb-2">
            <Button variant="ghost" size="sm" onClick={() => setIsScientific(!isScientific)}>
                {isScientific ? 'Standard' : 'Scientific'}
            </Button>
        </div>
        <div className={`grid grid-cols-4 gap-2 ${isScientific ? 'lg:grid-cols-5' : ''}`}>
            {isScientific && (
                <div className="col-span-4 lg:col-span-1 lg:order-first">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        {scientificButtons.map(btn => (
                            <Button key={btn.label} onClick={btn.handler} className={btn.className}>{btn.label}</Button>
                        ))}
                    </div>
                </div>
            )}
            <div className={`grid grid-cols-4 gap-2 ${isScientific ? 'col-span-4 lg:col-span-4' : 'col-span-4'}`}>
                {buttons.map(btn => (
                    <Button key={btn.label} onClick={btn.handler} className={btn.className}>{btn.label}</Button>
                ))}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
