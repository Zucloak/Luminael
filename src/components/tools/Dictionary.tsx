"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { languages } from '@/lib/languages';

export function Dictionary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lang, setLang] = useState('en');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm) return;

    if (lang !== 'en') {
      try {
        const response = await fetch(`https://${lang}.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&titles=${searchTerm}&origin=*`);
        if (!response.ok) {
          throw new Error('Word not found');
        }
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') {
          throw new Error('Word not found');
        }
        const extract = pages[pageId].extract;
        const audioMatches = extract.match(/<source src="(.*?)"/g);
        const phonetics = audioMatches ? audioMatches.map((match: string) => ({ audio: match.replace(/<source src="|"|type="video\/ogg"/g, '') })) : [];
        setDefinitions([{ word: searchTerm, meanings: [{ definitions: [{ definition: extract }] }], lang: lang, phonetics: phonetics }]);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
        setDefinitions([]);
      }
    } else {
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
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleSearch}>Search</Button>
        </div>
        <ScrollArea className="h-72 w-full rounded-md border p-4 mt-4">
          <div className="mt-4 p-4 bg-muted rounded-md min-h-[100px]">
            {error && <p className="text-red-500 text-center">{error}.<br/>You can try searching on <a href={`https://${lang}.wiktionary.org/wiki/${searchTerm}`} target="_blank" rel="noopener noreferrer" className="underline font-bold">Wiktionary</a>.</p>}
            {definitions.length > 0 ? (
              definitions.map((def, index) => (
                <div key={index} className="mb-4">
                  <h3 className="text-lg font-bold">{def.word}</h3>
                  {def.lang && def.lang !== 'en' ? (
                    <>
                      {def.phonetics.map((phonetic: { audio: string }, i: number) => (
                        <div key={i} className="flex items-center space-x-2">
                          {phonetic.audio && <audio controls src={phonetic.audio} className="h-8" />}
                        </div>
                      ))}
                      <div dangerouslySetInnerHTML={{ __html: def.meanings[0].definitions[0].definition }} />
                    </>
                  ) : (
                    <>
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
                            <div key={j} className="text-sm ml-4" dangerouslySetInnerHTML={{ __html: d.definition }} />
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Definitions will appear here...</p>
            )}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground mt-2 text-center">Dictionary support for some languages may be limited.</p>
      </CardContent>
    </Card>
  );
}
