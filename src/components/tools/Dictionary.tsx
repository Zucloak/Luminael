"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Dictionary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchTerm}`);
      if (!response.ok) {
        throw new Error('Word not found');
      }
      const data = await response.json();
      setDefinitions(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setDefinitions([]);
    }
  };

  return (
    <Card className="w-full border-0">
      <CardHeader>
        <CardTitle>Dictionary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Enter a word..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button type="button" onClick={handleSearch}>Search</Button>
        </div>
        <div className="mt-4 p-4 bg-muted rounded-md min-h-[100px]">
          {error && <p className="text-red-500">{error}</p>}
          {definitions.length > 0 ? (
            definitions.map((def, index) => (
              <div key={index} className="mb-4">
                <h3 className="text-lg font-bold">{def.word}</h3>
                {def.phonetics.map((phonetic: { text: string; audio: string }, i: number) => (
                  <div key={i} className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">{phonetic.text}</p>
                    {phonetic.audio && <audio controls src={phonetic.audio} className="h-8" />}
                  </div>
                ))}
                {def.meanings.map((meaning: { partOfSpeech: string, definitions: any[] }, i: number) => (
                  <div key={i} className="mt-2">
                    <h4 className="font-semibold">{meaning.partOfSpeech}</h4>
                    {meaning.definitions.map((d: { definition: string }, j: number) => (
                      <p key={j} className="text-sm ml-4">- {d.definition}</p>
                    ))}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Definitions will appear here...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
