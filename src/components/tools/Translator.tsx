"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Translator() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText) return;
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${inputText}&langpair=${sourceLang}|${targetLang}`);
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      const data = await response.json();
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails);
      }
      setTranslatedText(data.responseData.translatedText);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setTranslatedText('');
    }
  };

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Translator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Select value={sourceLang} onValueChange={setSourceLang}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
            </SelectContent>
          </Select>
          <ArrowRight className="h-6 w-6" />
          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Target Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <Textarea
            placeholder="Enter text to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
          />
          <div className="p-4 bg-muted rounded-md min-h-[10rem] flex items-center justify-center">
            {error ? <p className="text-red-500">{error}</p> : <p className="text-sm">{translatedText || 'Translation will appear here...'}</p>}
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
