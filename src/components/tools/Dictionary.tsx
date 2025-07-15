"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Dictionary() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    // Placeholder for API call
    alert(`Searching for: ${searchTerm}`);
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
          />
          <Button type="button" onClick={handleSearch}>Search</Button>
        </div>
        <div className="mt-4 p-4 bg-muted rounded-md min-h-[100px]">
          <p className="text-sm text-muted-foreground">Definitions will appear here...</p>
        </div>
      </CardContent>
    </Card>
  );
}
