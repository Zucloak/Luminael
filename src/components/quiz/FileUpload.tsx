'use client';
import {useState, useCallback} from 'react';
import {useDropzone} from 'react-dropzone';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {FileUp, FileText, CheckCircle} from 'lucide-react';

interface FileUploadProps {
  onFileProcessed: (text: string) => void;
  disabled: boolean;
}

export function FileUpload({onFileProcessed, disabled}: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }
      setFileName(file.name);

      const reader = new FileReader();

      reader.onabort = () => toast.error('File reading was aborted.');
      reader.onerror = () => toast.error('Failed to read the file.');
      reader.onload = async () => {
        const text = reader.result as string;

        if (file.type === 'application/pdf') {
          try {
            // Dynamically import pdf.js
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;

            const loadingTask = pdfjs.getDocument({data: text});
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map(item => ('str' in item ? item.str : "")).join(' ');
            }
            onFileProcessed(fullText);
            toast.success('PDF processed successfully!');
          } catch (error) {
            console.error(error);
            toast.error('Failed to parse PDF. The file may be corrupted.');
          }
        } else {
          onFileProcessed(text);
          toast.success('File processed successfully!');
        }
      };

      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    },
    [onFileProcessed]
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ease-in-out
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
        ${disabled ? 'cursor-not-allowed bg-muted/50' : 'hover:border-primary/80'}`}
    >
      <input {...getInputProps()} />
      {fileName ? (
        <div className="flex flex-col items-center gap-2 text-green-600">
          <CheckCircle className="w-12 h-12" />
          <p className="font-semibold">File ready: {fileName}</p>
          <p className="text-sm text-muted-foreground">
            You can now generate a quiz from this file.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <FileUp className="w-12 h-12 text-muted-foreground" />
          {isDragActive ? (
            <p className="font-semibold">Drop the file here ...</p>
          ) : (
            <>
              <p className="font-semibold">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, TXT, MD
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
