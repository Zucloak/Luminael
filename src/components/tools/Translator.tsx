"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export function Translator() {
  const [inputText, setInputText] = useState('');

  const handleTranslate = () => {
    // Placeholder for API call
    alert(`Translating: ${inputText}`);
  };

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Translator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <Textarea
            placeholder="Enter text to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
          />
          <div className="p-4 bg-muted rounded-md min-h-[10rem] flex items-center justify-center">
             <p className="text-sm text-muted-foreground">Translation will appear here...</p>
          </div>
        </div>
        <div className="flex justify-center mt-4">
            <Button type="button" onClick={handleTranslate}>
                Translate <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
