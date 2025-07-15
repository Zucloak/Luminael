"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

// More advanced state management for real-time LaTeX rendering
type Token = {
  type: 'num' | 'op' | 'func' | 'group' | 'const' | 'special';
  display: string; // What the user sees (LaTeX)
  expr: string;    // What mathjs evaluates
};

const createToken = (type: Token['type'], display: string, expr?: string): Token => ({
  type,
  display,
  expr: expr ?? display,
});

export function Calculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isShiftActive, setIsShiftActive] = useState(false);

  const tokensToDisplay = (currentTokens: Token[]): string => {
    return currentTokens.map(t => t.display).join(' ');
  };

  const tokensToExpression = (currentTokens: Token[]): string => {
    return currentTokens.map(t => t.expr).join('');
  };

  const handleInput = (token: Token) => {
    setTokens(prev => [...prev, token]);
    if (isShiftActive) setIsShiftActive(false);
  };

  const handleClear = () => setTokens([]);

  const handleBackspace = () => setTokens(prev => prev.slice(0, -1));

  const handleCalculate = () => {
    const expression = tokensToExpression(tokens);
    if (expression.length === 0) return;
    try {
      const result = evaluate(expression);
      const formatted = format(result, { notation: 'fixed', precision: 10 }).replace(/(\.0+|(?:\.\d*?[1-9])0*)$/, (match, p1) => p1.includes('.') ? p1.replace(/0+$/, '') : match);
      setTokens([createToken('num', formatted)]);
    } catch (error) {
      setTokens([createToken('special', 'Error')]);
    }
  };

  // Button styles
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
      <CardContent className="p-2 space-y-2">
        <div className="bg-muted text-muted-foreground rounded-lg p-3 text-right text-3xl font-mono break-all h-20 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{`\$${tokensToDisplay(tokens)}\$`}</MarkdownRenderer>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {/* Row 1 */}
          <Button onClick={() => setIsShiftActive(!isShiftActive)} className={btnShift}>Shift</Button>
          {renderButton('sin', 'sin⁻¹', () => handleInput(createToken('func', 'sin(')), () => handleInput(createToken('func', 'asin(')), btnOp)}
          {renderButton('cos', 'cos⁻¹', () => handleInput(createToken('func', 'cos(')), () => handleInput(createToken('func', 'acos(')), btnOp)}
          {renderButton('tan', 'tan⁻¹', () => handleInput(createToken('func', 'tan(')), () => handleInput(createToken('func', 'atan(')), btnOp)}
          <Button onClick={() => handleInput(createToken('const', 'π', 'pi'))} className={btnNum}>π</Button>

          {/* Row 2 */}
          <Button onClick={() => handleInput(createToken('op', '^{', '^'))} className={btnOp}>x^y</Button>
          {renderButton('log', '10^', () => handleInput(createToken('func', 'log(')), () => handleInput(createToken('op', '10^')), btnOp)}
          {renderButton('ln', 'e^', () => handleInput(createToken('func', 'ln(')), () => handleInput(createToken('op', 'e^')), btnOp)}
          <Button onClick={() => handleInput(createToken('group', '('))} className={btnOp}>(</Button>
          <Button onClick={() => handleInput(createToken('group', ')'))} className={btnOp}>)</Button>

          {/* Row 3 */}
          <Button onClick={() => handleInput(createToken('func', '\\sqrt{', 'sqrt('))} className={btnOp}>√</Button>
          <Button onClick={() => handleInput(createToken('op', '!', '!'))} className={btnOp}>x!</Button>
          <Button onClick={handleClear} className={btnClear}>C</Button>
          <Button onClick={handleBackspace} className={btnClear}>⌫</Button>
          <Button onClick={() => handleInput(createToken('op', '%', '/100'))} className={btnOp}>%</Button>

          {/* Row 4 */}
          <Button onClick={() => handleInput(createToken('num', '7'))} className={btnNum}>7</Button>
          <Button onClick={() => handleInput(createToken('num', '8'))} className={btnNum}>8</Button>
          <Button onClick={() => handleInput(createToken('num', '9'))} className={btnNum}>9</Button>
          <Button onClick={() => handleInput(createToken('op', '÷', '/'))} className={btnOp}>÷</Button>
          <Button onClick={() => handleInput(createToken('op', '×', '*'))} className={btnOp}>×</Button>

          {/* Row 5 */}
          <Button onClick={() => handleInput(createToken('num', '4'))} className={btnNum}>4</Button>
          <Button onClick={() => handleInput(createToken('num', '5'))} className={btnNum}>5</Button>
          <Button onClick={() => handleInput(createToken('num', '6'))} className={btnNum}>6</Button>
          <Button onClick={() => handleInput(createToken('op', '−', '-'))} className={btnOp}>−</Button>
          <Button onClick={() => handleInput(createToken('op', '+', '+'))} className={btnOp}>+</Button>

          {/* Row 6 */}
          <Button onClick={() => handleInput(createToken('num', '1'))} className={btnNum}>1</Button>
          <Button onClick={() => handleInput(createToken('num', '2'))} className={btnNum}>2</Button>
          <Button onClick={() => handleInput(createToken('num', '3'))} className={btnNum}>3</Button>
          <Button onClick={() => handleInput(createToken('num', '0'))} className={`${btnNum} col-span-2`}>0</Button>

          {/* Row 7 */}
          <Button onClick={() => handleInput(createToken('num', '.'))} className={btnNum}>.</Button>
          <Button onClick={() => handleInput(createToken('const', 'e'))} className={btnNum}>e</Button>
          <Button onClick={() => {}} className={btnNum}>Ans</Button>
          <Button onClick={handleCalculate} className={`${btnEquals} col-span-2`}>=</Button>
        </div>
      </CardContent>
    </Card>
  );
}
