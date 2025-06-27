"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { FileText, BrainCircuit, Sparkles, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const quizSetupSchema = z.object({
  numQuestions: z.coerce.number().min(1, "Must have at least 1 question.").max(20, "Maximum 20 questions."),
  topics: z.string().min(3, "Topics must be at least 3 characters.").optional().or(z.literal("")),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

type QuizSetupValues = z.infer<typeof quizSetupSchema>;

interface QuizSetupProps {
  onQuizStart: (fileContent: string, values: QuizSetupValues, isHellBound: boolean) => Promise<void>;
  isGenerating: boolean;
}

export function QuizSetup({ onQuizStart, isGenerating }: QuizSetupProps) {
  const [fileContent, setFileContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [isHellBound, setIsHellBound] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 5,
      topics: "",
      difficulty: "Medium",
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileContent("");
      setFileName("");
      setFileError("");
      setIsParsingFile(true);
      setFileName(file.name);

      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setFileContent(content);
          setIsParsingFile(false);
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            if (!e.target?.result) {
              setFileError("Failed to read file.");
              setIsParsingFile(false);
              return;
            }
            const typedarray = new Uint8Array(e.target.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
              fullText += '\n';
            }
            setFileContent(fullText);
            setFileError("");
            setIsParsingFile(false);
          };
          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error("Error parsing PDF:", error);
          setFileError("Could not read text from PDF. The file might be corrupted or image-based.");
          setIsParsingFile(false);
        }
      } else {
        setFileError("Please upload a .txt or .pdf file.");
        setFileName("");
        setIsParsingFile(false);
      }
    }
  };

  function onSubmit(values: QuizSetupValues) {
    if (!fileContent) {
      setFileError("Please upload a file and wait for it to be processed.");
      return;
    }
    onQuizStart(fileContent, values, isHellBound);
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          <BrainCircuit className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="font-headline text-4xl">Generate Your Quiz</CardTitle>
        <CardDescription className="text-lg">
          Upload your study material and let our AI create a custom quiz for you.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8 pt-2">
            <div className="space-y-2">
              <Label htmlFor="file-upload">1. Upload Content (.txt, .pdf)</Label>
              <Input id="file-upload" type="file" onChange={handleFileChange} accept=".txt,.pdf" className="pt-2 file:text-primary file:font-semibold" disabled={isParsingFile} />
              {isParsingFile && (
                 <p className="text-sm text-muted-foreground pt-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing {fileName}...
                 </p>
              )}
              {fileName && !isParsingFile && <p className="text-sm text-muted-foreground pt-2 flex items-center gap-2"><FileText className="h-4 w-4" /> {fileName}</p>}
              {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
            </div>

            <div className="space-y-2">
              <Label>2. Configure Your Quiz</Label>
              <div className="p-4 border rounded-md space-y-4 bg-background">
                <FormField
                  control={form.control}
                  name="numQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Questions</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center space-x-2 p-4 bg-destructive/10 rounded-md border border-destructive/20">
                  <Wand2 className="h-8 w-8 text-destructive" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="hell-bound-mode" className="text-destructive font-bold">HELL BOUND MODE</Label>
                    <p className="text-xs text-destructive/80">Generate an extremely difficult quiz to truly test your knowledge.</p>
                  </div>
                  <Switch
                    id="hell-bound-mode"
                    checked={isHellBound}
                    onCheckedChange={setIsHellBound}
                  />
                </div>
                {!isHellBound && (
                  <div className="space-y-4 animate-in fade-in-0 duration-300">
                    <FormField
                      control={form.control}
                      name="topics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topics to Cover (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Chapter 1, Photosynthesis" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full text-lg py-6" disabled={isGenerating || isParsingFile}>
              {isGenerating ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : isParsingFile ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing file...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Quiz
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
