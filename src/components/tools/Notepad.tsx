"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';

export function Notepad() {
  const [value, setValue] = useState('');

  const exportToTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([value], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "notes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToPdf = () => {
    const pdf = new jsPDF();
    pdf.text(value, 10, 10);
    pdf.save('notes.pdf');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notepad</CardTitle>
        <div className="flex gap-2">
            <Button onClick={exportToTxt} variant="outline"><Download className="mr-2 h-4 w-4" /> Export as TXT</Button>
            <Button onClick={exportToPdf}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[400px]"
            placeholder="Type your notes here..."
        />
      </CardContent>
    </Card>
  );
}
