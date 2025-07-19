"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { evaluate, format } from 'mathjs';
import nerdamer from 'nerdamer';
import 'nerdamer/Solve'; // Load the Solve add-on
import { MarkdownRenderer } from '../common/MarkdownRenderer';

type FractionToken = {
  type: 'fraction';
  numerator: Token[];
  denominator: Token[];
};

type Token = {
  type: 'num' | 'op' | 'func' | 'group' | 'const' | 'special';
  display: string;
  expr: string;
} | FractionToken;

const createToken = (type: Token['type'], display: string, expr?: string): Token => ({
  type,
  display,
  expr: expr ?? display,
});

export function Calculator() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [cursorContext, setCursorContext] = useState<any[]>(['root']);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [result, setResult] = useState<string>('');

  const tokensToDisplay = (currentTokens: Token[], cursorIndex: number, isSubLevel: boolean = false): string => {
    let displayParts: string[] = [];
    currentTokens.forEach((token, index) => {
      if (index === cursorIndex && !isSubLevel) {
        displayParts.push('<span class="cursor"></span>');
      }
      if (token.type === 'fraction') {
        const numeratorStr = tokensToDisplay(token.numerator, -1, true);
        const denominatorStr = tokensToDisplay(token.denominator, -1, true);
        displayParts.push(`\\frac{${numeratorStr}}{${denominatorStr}}`);
      } else {
        displayParts.push(token.display);
      }
    });
    if (cursorIndex === currentTokens.length && !isSubLevel) {
      displayParts.push('<span class="cursor"></span>');
    }
    return displayParts.join(' ');
  };
  const tokensToExpression = (currentTokens: Token[]): string => {
    return currentTokens.map(token => {
      if (token.type === 'fraction') {
        const numeratorExpr = tokensToExpression(token.numerator);
        const denominatorExpr = tokensToExpression(token.denominator);
        return `(${numeratorExpr})/(${denominatorExpr})`;
      }
      return token.expr;
    }).join('');
  };

  const handleInput = (token: Token) => {
    setTokens(prev => {
      const newTokens = JSON.parse(JSON.stringify(prev)); // Deep copy
      let currentLevel = newTokens;
      for (let i = 1; i < cursorContext.length; i++) {
        currentLevel = currentLevel[cursorContext[i]];
      }
      currentLevel.splice(cursorPosition, 0, token);
      return newTokens;
    });
    setCursorPosition(prev => prev + 1);
    if (isShiftActive) setIsShiftActive(false);
  };

  const handleClear = () => {
    setTokens([]);
    setCursorPosition(0);
    setResult('');
  };

  const handleBackspace = () => {
    if (cursorPosition > 0) {
      setTokens(prev => {
        const newTokens = JSON.parse(JSON.stringify(prev)); // Deep copy
        let currentLevel = newTokens;
        for (let i = 1; i < cursorContext.length; i++) {
          currentLevel = currentLevel[cursorContext[i]];
        }
        currentLevel.splice(cursorPosition - 1, 1);
        return newTokens;
      });
      setCursorPosition(prev => prev - 1);
    }
  };

  const moveCursor = (direction: 'left' | 'right' | 'up' | 'down') => {
    let currentTokens = tokens;
    for (let i = 1; i < cursorContext.length; i++) {
      currentTokens = currentTokens[cursorContext[i]];
    }

    if (direction === 'left') {
      if (cursorPosition > 0) {
        setCursorPosition(prev => prev - 1);
      } else if (cursorContext.length > 1) {
        const newContext = cursorContext.slice(0, -2);
        setCursorContext(newContext);
        setCursorPosition(newContext[newContext.length - 1]);
      }
    } else if (direction === 'right') {
      const currentToken = currentTokens[cursorPosition];
      if (currentToken && currentToken.type === 'fraction') {
        setCursorContext([...cursorContext, cursorPosition, 'numerator']);
        setCursorPosition(0);
      } else if (cursorPosition < currentTokens.length) {
        setCursorPosition(prev => prev + 1);
      }
    } else if (direction === 'up') {
      if (cursorContext[cursorContext.length - 1] === 'denominator') {
        const newContext = [...cursorContext.slice(0, -1), 'numerator'];
        setCursorContext(newContext);
        setCursorPosition(0);
      }
    } else if (direction === 'down') {
      if (cursorContext[cursorContext.length - 1] === 'numerator') {
        const newContext = [...cursorContext.slice(0, -1), 'denominator'];
        setCursorContext(newContext);
        setCursorPosition(0);
      }
    }
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

    try {
      const result = evaluate(expression);
      const formatted = format(result, { notation: 'fixed', precision: 10 }).replace(/(\.0+|(?:\.\d*?[1-9])0*)$/, (match, p1) => p1.includes('.') ? p1.replace(/0+$/, '') : match);
      setResult(formatted);
    } catch (error) {
      setResult('Error');
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
        .calculator-display .katex-render:has(span:contains('❚')) {
          animation: blink 1s step-start infinite;
        }
      `}</style>
      <CardContent className="p-2 space-y-2">
        <div className="calculator-display bg-muted text-muted-foreground rounded-lg p-3 text-right text-3xl font-mono break-all h-12 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{`\$${tokensToDisplay(tokens, cursorPosition)}\$`}</MarkdownRenderer>
        </div>
        <div className="calculator-display bg-muted text-muted-foreground rounded-lg p-3 text-right text-2xl font-mono break-all h-12 flex items-center justify-end overflow-x-auto">
          <MarkdownRenderer>{result}</MarkdownRenderer>
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
          {renderButton('ln', 'e^', () => handleInput(createToken('func', 'ln(')), () => handleInput(createToken('op', 'e^')), btnOp)}
          <Button onClick={() => handleInput(createToken('group', '('))} className={btnOp}>(</Button>
          <Button onClick={() => handleInput(createToken('group', ')'))} className={btnOp}>)</Button>

          {/* Row 3 */}
          <Button onClick={() => handleInput({type: 'fraction', numerator: [], denominator: []})} className={btnOp}>a b/c</Button>
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
