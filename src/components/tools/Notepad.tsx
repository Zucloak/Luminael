"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <p>Loading editor...</p>
});

export function Notepad() {
  const [value, setValue] = useState('');

  useEffect(() => {
    // This code runs only on the client
    if (typeof window !== 'undefined') {
        const Quill = require('react-quill').Quill;
        const Link = Quill.import('formats/link');
        Link.sanitize = function(url: string) {
          if(url.indexOf("http") === 0) return url;
          return "http://" + url;
        }
    }
  }, []);

  const exportToTxt = () => {
    const element = document.createElement("a");
    // To get plain text from Quill's delta format, we can use a trick
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = value;
    const file = new Blob([tempDiv.innerText], {type: 'text/plain'});

    element.href = URL.createObjectURL(file);
    element.download = "notes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToPdf = () => {
    const input = document.createElement('div');
    input.innerHTML = value;
    document.body.appendChild(input);

    // Ensure styles are applied for rendering
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.style.width = '800px'; // A4-like width
    input.style.padding = '20px';
    input.style.background = 'white';
    input.style.color = 'black';


    html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('notes.pdf');
        document.body.removeChild(input);
      });
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline','strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-0">
       <style>{`
        .ql-toolbar {
            border-top-left-radius: var(--radius);
            border-top-right-radius: var(--radius);
            background-color: var(--muted);
        }
        .ql-container {
            border-bottom-left-radius: var(--radius);
            border-bottom-right-radius: var(--radius);
        }
        .ql-editor {
            min-height: 400px;
            background-color: var(--background);
            color: var(--foreground);
        }
      `}</style>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notepad</CardTitle>
        <div className="flex gap-2">
            <Button onClick={exportToTxt} variant="outline"><Download className="mr-2 h-4 w-4" /> Export as TXT</Button>
            <Button onClick={exportToPdf}><Download className="mr-2 h-4 w-4" /> Export as PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ReactQuill theme="snow" value={value} onChange={setValue} modules={modules}/>
      </CardContent>
    </Card>
  );
}
