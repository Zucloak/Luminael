"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

// A simple approach to manage expressions for rendering and calculation
// For a production app, a more robust token-based system or AST would be better.
interface CalcState {
  display: string; // What the user sees, potentially with LaTeX
  expression: string; // What mathjs evaluates
}

export function Calculator() {
  const [state, setState] = useState<CalcState>({ display: '0', expression: '0' });
  const [isScientific, setIsScientific] = useState(true); // Default to scientific

  const handleInput = (value: string, exprValue?: string) => {
    setState(prev => {
      if (prev.display === 'Error' || prev.display === 'NaN') {
        return { display: value, expression: exprValue || value };
      }
      if (prev.display === '0') {
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
      const lastChar = prev.expression.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return {
          display: prev.display.slice(0, -1) + op,
          expression: prev.expression.slice(0, -1) + op
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
      if (prev.display === 'Error' || prev.display.length === 1) {
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
    try {
      const result = evaluate(state.expression);
      const formattedResult = format(result, { precision: 14 });
      setState({ display: formattedResult, expression: formattedResult });
    } catch (error) {
      setState({ display: 'Error', expression: 'Error' });
    }
  };

  const handleScientificFunc = (displayFunc: string, exprFunc: string) => {
    setState(prev => {
      const isInitialState = prev.display === '0' || prev.display === 'Error' || prev.display === 'NaN';
      const newDisplay = isInitialState ? `${displayFunc}(` : `${displayFunc}(${prev.display})`;
      const newExpr = isInitialState ? `${exprFunc}(` : `${exprFunc}(${prev.expression})`;
      return { display: newDisplay, expression: newExpr };
    });
  };

  // Button styles based on CANON F-789SGA layout
  const btnBase = "h-10 text-sm rounded-md shadow-sm";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80`;
  const btnOp = `${btnBase} bg-secondary hover:bg-secondary/80`;
  const btnEquals = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
  const btnClear = `${btnBase} bg-destructive/80 text-destructive-foreground hover:bg-destructive/90`;

  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg border-0 bg-background">
      <CardContent className="p-2 space-y-2">
        <div className="bg-muted text-muted-foreground rounded-lg p-3 mb-2 text-right text-3xl font-mono break-all h-20 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{`\$${state.display}\$`}</MarkdownRenderer>
        </div>

        <div className="grid grid-cols-5 grid-rows-7 gap-1.5">
          {/* Row 1 */}
          <Button onClick={() => handleScientificFunc('sqrt', 'sqrt')} className={btnOp}>√</Button>
          <Button onClick={() => handleInput('^2', '^2')} className={btnOp}>x²</Button>
          <Button onClick={() => handleInput('^', '^')} className={btnOp}>x^y</Button>
          <Button onClick={() => handleScientificFunc('log', 'log10')} className={btnOp}>log</Button>
          <Button onClick={() => handleScientificFunc('ln', 'log')} className={btnOp}>ln</Button>

          {/* Row 2 */}
          <Button onClick={() => handleInput('(-)', '-')} className={btnNum}>(-)</Button>
          <Button onClick={() => {}} className={btnNum}>°&apos;&apos;&apos;</Button>
          <Button onClick={() => handleScientificFunc('sin', 'sin')} className={btnNum}>sin</Button>
          <Button onClick={() => handleScientificFunc('cos', 'cos')} className={btnNum}>cos</Button>
          <Button onClick={() => handleScientificFunc('tan', 'tan')} className={btnNum}>tan</Button>

          {/* Row 3 */}
          <Button onClick={() => {}} className={btnNum}>RCL</Button>
          <Button onClick={() => {}} className={btnNum}>ENG</Button>
          <Button onClick={() => handleInput('(', '(')} className={btnNum}>(</Button>
          <Button onClick={() => handleInput(')', ')')} className={btnNum}>)</Button>
          <Button onClick={() => handleInput('%', '%')} className={btnOp}>%</Button>

          {/* Row 4 */}
          <Button onClick={() => handleInput('7')} className={btnNum}>7</Button>
          <Button onClick={() => handleInput('8')} className={btnNum}>8</Button>
          <Button onClick={() => handleInput('9')} className={btnNum}>9</Button>
          <Button onClick={handleBackspace} className={btnClear}>DEL</Button>
          <Button onClick={handleClear} className={btnClear}>AC</Button>

          {/* Row 5 */}
          <Button onClick={() => handleInput('4')} className={btnNum}>4</Button>
          <Button onClick={() => handleInput('5')} className={btnNum}>5</Button>
          <Button onClick={() => handleInput('6')} className={btnNum}>6</Button>
          <Button onClick={() => handleOperator('*')} className={btnOp}>×</Button>
          <Button onClick={() => handleOperator('/')} className={btnOp}>÷</Button>

          {/* Row 6 */}
          <Button onClick={() => handleInput('1')} className={btnNum}>1</Button>
          <Button onClick={() => handleInput('2')} className={btnNum}>2</Button>
          <Button onClick={() => handleInput('3')} className={btnNum}>3</Button>
          <Button onClick={() => handleOperator('+')} className={btnOp}>+</Button>
          <Button onClick={() => handleOperator('-')} className={btnOp}>−</Button>

          {/* Row 7 */}
          <Button onClick={() => handleInput('0')} className={btnNum}>0</Button>
          <Button onClick={() => handleInput('.')} className={btnNum}>.</Button>
          <Button onClick={() => handleInput('*10^', '*10^')} className={btnNum}>EXP</Button>
          <Button onClick={() => {}} className={btnNum}>Ans</Button>
          <Button onClick={handleCalculate} className={btnEquals}>=</Button>
        </div>
      </CardContent>
    </Card>
  );
}
