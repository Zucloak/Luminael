"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

// A simple approach to manage expressions for rendering and calculation
// For a production app, a more robust token-based system or AST would be better.
interface CalcState {
  display: string; // What the user sees, potentially with LaTeX
  expression: string; // What mathjs evaluates
}

export function Calculator() {
  const [state, setState] = useState<CalcState>({ display: '0', expression: '0' });

  const handleInput = (value: string, exprValue?: string) => {
    setState(prev => {
      if (prev.display === 'Error' || prev.display === 'NaN') {
        return { display: value, expression: exprValue || value };
      }
      if (prev.display === '0' && value !== '.') {
        return { display: value, expression: exprValue || value };
      }
      return {
        display: prev.display + value,
        expression: prev.expression + (exprValue || value)
      };
    });
  };

  const handleOperator = (op: string) => {
    setState(prev => {
      if (prev.expression === 'Error' || prev.expression === 'NaN') return prev;
      const lastChar = prev.expression.trim().slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return {
          display: prev.display.trim().slice(0, -1) + op,
          expression: prev.expression.trim().slice(0, -1) + op
        };
      } else {
        return {
          display: prev.display + op,
          expression: prev.expression + op
        };
      }
    });
  };

  const handleClear = () => setState({ display: '0', expression: '0' });

  const handleBackspace = () => {
    setState(prev => {
      if (prev.display === 'Error' || prev.display === 'NaN' || prev.display.length === 1) {
        return { display: '0', expression: '0' };
      }
      // This is a simplistic backspace; a token-aware one would be better.
      return {
        display: prev.display.slice(0, -1),
        expression: prev.expression.slice(0, -1)
      };
    });
  };

  const handleCalculate = () => {
    if (state.expression === 'Error') return;
    try {
      const expression = state.expression.replace(/--/g, '+'); // Basic sanitization
      const result = evaluate(expression);
      const formattedResult = format(result, { notation: 'fixed', precision: 10 }).replace(/(\.0+|(?:\.\d*?[1-9])0*)$/, (match, p1) => p1.includes('.') ? p1.replace(/0+$/, '') : match);
      setState({ display: formattedResult, expression: formattedResult });
    } catch (error) {
      setState({ display: 'Error', expression: 'Error' });
    }
  };

  const handleScientificFunc = (displayFunc: string, exprFunc?: string) => {
    const func = exprFunc || displayFunc;
    setState(prev => {
      const isInitialState = prev.display === '0' || prev.display === 'Error' || prev.display === 'NaN';
      const newDisplay = isInitialState ? `${displayFunc}(` : `${displayFunc}(${prev.display})`;
      const newExpr = isInitialState ? `${func}(` : `${func}(${prev.expression})`;
      return { display: newDisplay, expression: newExpr };
    });
  };

  // Button styles with explicit text colors for contrast
  const btnBase = "h-12 text-lg rounded-md shadow-sm";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80 text-foreground`;
  const btnOp = `${btnBase} bg-primary/80 hover:bg-primary/90 text-primary-foreground`;
  const btnFunc = `${btnBase} bg-secondary hover:bg-secondary/80 text-secondary-foreground`;
  const btnClear = `${btnBase} bg-destructive/80 hover:bg-destructive/90 text-destructive-foreground`;
  const btnEquals = `${btnBase} bg-primary hover:bg-primary/90 text-primary-foreground row-span-2 h-full`;

  return (
    <Card className="w-full max-w-xs mx-auto shadow-lg border-0 bg-background">
      <CardContent className="p-2 space-y-2">
        <div className="bg-muted text-muted-foreground rounded-lg p-3 text-right text-4xl font-mono break-all h-20 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{`\$${state.display}\$`}</MarkdownRenderer>
        </div>

        <div className="grid grid-cols-5 grid-rows-6 gap-2">
          {/* Row 1 */}
          <Button onClick={() => handleScientificFunc('sin')} className={btnFunc}>sin</Button>
          <Button onClick={() => handleScientificFunc('cos')} className={btnFunc}>cos</Button>
          <Button onClick={() => handleScientificFunc('tan')} className={btnFunc}>tan</Button>
          <Button onClick={() => handleInput('(')} className={btnFunc}>(</Button>
          <Button onClick={() => handleInput(')')} className={btnFunc}>)</Button>

          {/* Row 2 */}
          <Button onClick={() => handleInput('^', '^')} className={btnFunc}>x^y</Button>
          <Button onClick={() => handleScientificFunc('sqrt')} className={btnFunc}>√</Button>
          <Button onClick={handleClear} className={btnClear}>C</Button>
          <Button onClick={handleBackspace} className={btnClear}>⌫</Button>
          <Button onClick={() => handleOperator('/')} className={btnOp}>÷</Button>

          {/* Row 3 */}
          <Button onClick={() => handleInput('7')} className={btnNum}>7</Button>
          <Button onClick={() => handleInput('8')} className={btnNum}>8</Button>
          <Button onClick={() => handleInput('9')} className={btnNum}>9</Button>
          <Button onClick={() => handleOperator('*')} className={btnOp} style={{fontSize: '24px'}}>×</Button>

          {/* Row 4 */}
          <Button onClick={() => handleInput('4')} className={btnNum}>4</Button>
          <Button onClick={() => handleInput('5')} className={btnNum}>5</Button>
          <Button onClick={() => handleInput('6')} className={btnNum}>6</Button>
          <Button onClick={() => handleOperator('-')} className={btnOp} style={{fontSize: '24px'}}>−</Button>

          {/* Row 5 */}
          <Button onClick={() => handleInput('1')} className={btnNum}>1</Button>
          <Button onClick={() => handleInput('2')} className={btnNum}>2</Button>
          <Button onClick={() => handleInput('3')} className={btnNum}>3</Button>
          <Button onClick={() => handleOperator('+')} className={btnOp} style={{fontSize: '24px'}}>+</Button>

          {/* Equals button spanning two rows */}
          <div className="col-start-5 row-start-3 row-span-2">
             <Button onClick={handleCalculate} className={btnEquals}>=</Button>
          </div>

          {/* Row 6 */}
          <Button onClick={() => handleInput('0')} className={`${btnNum} col-span-2`}>0</Button>
          <Button onClick={() => handleInput('.')} className={btnNum}>.</Button>
          <Button onClick={() => handleInput('%', '/100')} className={btnOp}>%</Button>
        </div>
      </CardContent>
    </Card>
  );
}
