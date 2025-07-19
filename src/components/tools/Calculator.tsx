"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Solve'; // Load the Solve add-on
import { MarkdownRenderer } from '../common/MarkdownRenderer';

type Token = {
  type: 'num' | 'op' | 'func' | 'group' | 'const' | 'special';
  display: string;
  expr: string;
};

const createToken = (type: Token['type'], display: string, expr?: string): Token => ({
  type,
  display,
  expr: expr ?? display,
});

export function Calculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const tokensToDisplay = (currentTokens: Token[], cursorIndex: number): string[] => {
    const displayTokens: string[] = currentTokens.map(t => t.display);
    displayTokens.splice(cursorIndex, 0, '|');
    return displayTokens;
  };
  const tokensToExpression = (currentTokens: Token[]): string => {
    let expr = '';
    for (const token of currentTokens) {
      if (token.display.startsWith('\\frac')) {
        // This is a naive implementation and will not work for nested fractions.
        // A proper parser would be needed for a robust solution.
        const content = token.display.replace('\\frac{', '').replace('}', '');
        const parts = content.split('{');
        const numerator = parts[0];
        const denominator = parts[1].replace('}', '');
        expr += `(${numerator})/(${denominator})`;
      } else {
        expr += token.expr;
      }
    }
    return expr;
  };

  const handleInput = (token: Token) => {
    setTokens(prev => {
      const newTokens = [...prev];
      newTokens.splice(cursorPosition, 0, token);
      return newTokens;
    });
    setCursorPosition(prev => prev + 1);
    if (isShiftActive) setIsShiftActive(false);
  };

  const handleClear = () => setTokens([]);
  const handleBackspace = () => {
    if (cursorPosition > 0) {
      setTokens(prev => {
        const newTokens = [...prev];
        newTokens.splice(cursorPosition - 1, 1);
        return newTokens;
      });
      setCursorPosition(prev => prev - 1);
    }
  };

  const moveCursor = (direction: 'left' | 'right' | 'up' | 'down') => {
    setCursorPosition(prev => {
      if (direction === 'left') {
        return Math.max(0, prev - 1);
      } else if (direction === 'right') {
        return Math.min(tokens.length, prev + 1);
      }
      return prev;
    });
  };

  const handleCalculate = () => {
    let expression = tokensToExpression(tokens);
    if (expression.length === 0) return;

    // Add closing parentheses for functions if they are missing
    const openParenCount = (expression.match(/\(/g) || []).length;
    const closeParenCount = (expression.match(/\)/g) || []).length;
    if (openParenCount > closeParenCount) {
      expression += ')'.repeat(openParenCount - closeParenCount);
    }

    console.log("Expression to evaluate:", expression);

    try {
      const result = evaluate(expression);
      const formatted = format(result, { notation: 'fixed', precision: 10 }).replace(/(\.0+|(?:\.\d*?[1-9])0*)$/, (match, p1) => p1.includes('.') ? p1.replace(/0+$/, '') : match);
      setTokens([createToken('num', formatted)]);
    } catch (error) {
      setTokens([createToken('special', 'Error')]);
    }
  };

  const handleSolve = () => {
    const expression = tokensToExpression(tokens);
    if (expression.length === 0) return;
    try {
      // Assuming the equation is in the form of 'expression=0' and solving for 'x'
      // We cast to `any` to bypass TypeScript's check, as the 'Solve' add-on dynamically adds the method at runtime.
      const solutions = (nerdamer as any).solve(expression, 'x').toString();
      const formattedSolutions = solutions.replace(/[\[\]]/g, ''); // Remove brackets
      setTokens([createToken('special', `x = ${formattedSolutions}`)]);
    } catch (error) {
      setTokens([createToken('special', 'Solve Error')]);
    }
  };

  const btnBase = "h-11 text-sm rounded-md shadow-sm";
  const btnNum = `${btnBase} bg-muted hover:bg-muted/80 text-foreground`;
  const btnOp = `${btnBase} bg-secondary hover:bg-secondary/80 text-secondary-foreground`;
  const btnShift = `${btnBase} ${isShiftActive ? 'bg-yellow-400 text-black' : 'bg-orange-400 text-white'} hover:bg-yellow-500`;
  const btnClear = `${btnBase} bg-destructive/80 hover:bg-destructive/90 text-destructive-foreground`;
  const btnEquals = `${btnBase} bg-primary hover:bg-primary/90 text-primary-foreground`;

  const renderButton = (label: string, shiftLabel: string, action: () => void, shiftAction: () => void, className: string) => {
    const currentLabel = isShiftActive ? shiftLabel : label;
    const currentAction = isShiftActive ? shiftAction : action;
    return <Button onClick={currentAction} className={className}>{currentLabel}</Button>;
  };

  return (
    <Card className="w-full max-w-xs mx-auto shadow-lg border-0 bg-background">
      <style>{`
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        .cursor {
          animation: blink 1s step-start infinite;
        }
      `}</style>
      <CardContent className="p-2 space-y-2">
        <div className="bg-muted text-muted-foreground rounded-lg p-3 text-right text-3xl font-mono break-all h-20 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{`\$${tokensToDisplay(tokens, cursorPosition).join(' ')}\$`}</MarkdownRenderer>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {/* Navigation Row */}
          <Button onClick={() => moveCursor('left')} className={btnOp}>←</Button>
          <Button onClick={() => moveCursor('right')} className={btnOp}>→</Button>
          <Button onClick={() => moveCursor('up')} className={btnOp}>↑</Button>
          <Button onClick={() => moveCursor('down')} className={btnOp}>↓</Button>
          <div></div>
          {/* Row 1 */}
          <Button onClick={() => setIsShiftActive(!isShiftActive)} className={btnShift}>Shift</Button>
          {renderButton('sin', 'sin⁻¹', () => handleInput(createToken('func', 'sin(')), () => handleInput(createToken('func', 'asin(')), btnOp)}
          {renderButton('cos', 'cos⁻¹', () => handleInput(createToken('func', 'cos(')), () => handleInput(createToken('func', 'acos(')), btnOp)}
          {renderButton('tan', 'tan⁻¹', () => handleInput(createToken('func', 'tan(')), () => handleInput(createToken('func', 'atan(')), btnOp)}
          <Button onClick={() => handleInput(createToken('op', '^', '^'))} className={btnOp}>x^y</Button>

          {/* Row 2 */}
          <Button onClick={() => handleInput(createToken('func', '\\sqrt{', 'sqrt('))} className={btnOp}>√</Button>
          {renderButton('log', '10^', () => handleInput(createToken('func', 'log(')), () => handleInput(createToken('op', '10^')), btnOp)}
          {renderButton('ln', 'e^', () => handleInput(createToken('func', 'log(')), () => handleInput(createToken('op', 'e^')), btnOp)}
          <Button onClick={() => handleInput(createToken('group', '('))} className={btnOp}>(</Button>
          <Button onClick={() => handleInput(createToken('group', ')'))} className={btnOp}>)</Button>

          {/* Row 3 */}
          <Button onClick={() => handleInput(createToken('func', '\\frac{}{}'))} className={btnOp}>a b/c</Button>
          <Button onClick={() => handleInput(createToken('op', '!', '!'))} className={btnOp}>x!</Button>
          <Button onClick={handleClear} className={btnClear}>C</Button>
          <Button onClick={handleBackspace} className={btnClear}>⌫</Button>
          {renderButton('SOLVE', 'CALC', handleSolve, handleCalculate, btnEquals)}

          {/* Row 4 */}
          <Button onClick={() => handleInput(createToken('num', '7'))} className={btnNum}>7</Button>
          <Button onClick={() => handleInput(createToken('num', '8'))} className={btnNum}>8</Button>
          <Button onClick={() => handleInput(createToken('num', '9'))} className={btnNum}>9</Button>
          <Button onClick={() => handleInput(createToken('op', '×', '*'))} className={btnOp}>×</Button>
          <Button onClick={() => handleInput(createToken('op', '÷', '/'))} className={btnOp}>÷</Button>

          {/* Row 5 */}
          <Button onClick={() => handleInput(createToken('num', '4'))} className={btnNum}>4</Button>
          <Button onClick={() => handleInput(createToken('num', '5'))} className={btnNum}>5</Button>
          <Button onClick={() => handleInput(createToken('num', '6'))} className={btnNum}>6</Button>
          <Button onClick={() => handleInput(createToken('op', '−', '-'))} className={btnOp}>−</Button>
          <Button onClick={() => handleInput(createToken('op', '+', '+'))} className={btnOp}>+</Button>

          {/* Row 6 & 7 */}
          <Button onClick={() => handleInput(createToken('num', '1'))} className={btnNum}>1</Button>
          <Button onClick={() => handleInput(createToken('num', '2'))} className={btnNum}>2</Button>
          <Button onClick={() => handleInput(createToken('num', '3'))} className={btnNum}>3</Button>
          <div className="col-span-2 row-span-2 grid grid-rows-2 gap-1.5">
             <Button onClick={() => {}} className={`${btnNum} row-span-1`}>Ans</Button>
             <Button onClick={handleCalculate} className={`${btnEquals} row-span-1`}>=</Button>
          </div>

          <Button onClick={() => handleInput(createToken('const', 'e'))} className={btnNum}>e</Button>
          <Button onClick={() => handleInput(createToken('num', '0'))} className={btnNum}>0</Button>
          <Button onClick={() => handleInput(createToken('num', '.'))} className={btnNum}>.</Button>
        </div>
      </CardContent>
    </Card>
  );
}
