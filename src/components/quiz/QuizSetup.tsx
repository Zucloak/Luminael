
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { FileText, Sparkles, Loader2, AlertTriangle, Timer, X, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useApiKey } from "@/hooks/use-api-key";
import { PulsingCore } from "@/components/common/PulsingCore";
import { PulsingCoreRed } from "../common/PulsingCoreRed";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// ImageIcon and Trash2Icon are no longer needed here as the specific image upload UI is removed
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuizSetup } from "@/hooks/use-quiz-setup";
import { useToast } from "@/hooks/use-toast"; // Import useToast


const quizSetupSchema = z.object({
  numQuestions: z.coerce.number().min(1, "Must be at least 1 question.").max(100, "Maximum 100 questions."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  questionFormat: z.enum(["multipleChoice", "problemSolving", "openEnded", "mixed"]).default("multipleChoice"),
  timerEnabled: z.boolean().default(false),
  timerPerQuestion: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nonnegative("Timer must be a positive number.").optional()
  )
}).refine(data => {
  if (data.timerEnabled) {
    return data.timerPerQuestion !== undefined && data.timerPerQuestion > 0;
  }
  return true;
}, {
  message: "Please set a time greater than 0.",
  path: ["timerPerQuestion"],
});


type QuizSetupValues = z.infer<typeof quizSetupSchema>;

interface QuizSetupProps {
  onQuizStart: (values: QuizSetupValues) => Promise<void>;
  isGenerating: boolean;
  isHellBound: boolean;
  onHellBoundToggle: (checked: boolean) => void;
}

export function QuizSetup({ onQuizStart, isGenerating, isHellBound, onHellBoundToggle }: QuizSetupProps) {
  const [isClient, setIsClient] = useState(false);
  const { apiKey, loading: apiKeyLoading } = useApiKey();
  const { toast } = useToast(); // Initialize toast
  const { 
    processedFiles,
    fileError,
    isParsing,
    parseProgress,
    handleFileChange,
    removeFile,
    stopParsing,
    isAnalyzingContent,
    canGenerateCalculative,
    isEcoModeActive, // Added isEcoModeActive
    toggleEcoMode,   // Added toggleEcoMode
    // Problem Image specific states and handlers are removed from destructuring
  } = useQuizSetup();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<QuizSetupValues>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      numQuestions: 10,
      difficulty: "Medium",
      questionFormat: "multipleChoice",
      timerEnabled: false,
      timerPerQuestion: undefined
    },
  });

  const timerEnabled = form.watch("timerEnabled");

  function onSubmit(values: QuizSetupValues) {
    if (processedFiles.length === 0) {
      form.setError("root", { type: "manual", message: "Please upload one or more files and wait for them to be processed." });
      return;
    }
    if (!apiKey) {
      form.setError("root", { type: "manual", message: "Please set your Gemini API key before starting the quiz." });
      return;
    }
    onQuizStart(values);
  }

  const isApiKeyMissing = !apiKey;
  const isProcessing = isGenerating || isParsing || isAnalyzingContent; // Include isAnalyzingContent

  if (!isClient) {
    return (
       <Card className="w-full max-w-3xl mx-auto animate-in fade-in-50 duration-500">
          <CardHeader className="text-center items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-10 w-48 mt-4" />
            <Skeleton className="h-4 w-64 mt-2" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="p-4 border rounded-md space-y-4 bg-background/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-12 w-full" />
          </CardFooter>
        </Card>
    );
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {isHellBound && (
        <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 opacity-60 animate-supercharged-border bg-[length:400%_400%]" />
      )}
      <Card className={cn(
        "w-full relative animate-in fade-in-50 duration-500",
        isHellBound ? "bg-card/80 backdrop-blur-sm border-0" : "shadow-2xl"
      )}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative h-16 w-16 flex items-center justify-center">
            <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-0" : "opacity-100")}>
              <PulsingCore className="h-16 w-16" />
            </div>
            <div className={cn("absolute inset-0 transition-opacity duration-500", isHellBound ? "opacity-100" : "opacity-0")}>
              <PulsingCoreRed className="h-16 w-16" />
            </div>
          </div>
          <CardTitle className="font-headline text-4xl">Luminael AI</CardTitle>
          <CardDescription className="text-sm text-muted-foreground italic px-4">
              {isHellBound 
                ? "You seek a true trial. Let's forge your knowledge in fire."
                : "Ignite your potential. Master any subject."
              }
          </CardDescription>
          <CardDescription className="pt-2">
            Upload your materials (.txt, .pdf, .md, .docx, .png, .jpg) and the AI will create a custom quiz.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-2">
                <Label className="text-lg font-semibold">1. Upload Content</Label>
                <div className="flex items-center space-x-2 mt-2 mb-3 justify-end">
                  <Switch
                    id="eco-mode-toggle"
                    checked={isEcoModeActive}
                    onCheckedChange={toggleEcoMode}
                    disabled={isProcessing || apiKeyLoading}
                  />
                  <Label htmlFor="eco-mode-toggle" className="text-sm font-medium">
                    ECO MODE
                  </Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Leaf className={cn("h-4 w-4 cursor-help", isEcoModeActive ? "text-green-500" : "text-muted-foreground/50")} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-semibold mb-1">ECO MODE {isEcoModeActive ? 'Active' : 'Inactive'}</p>
                        {isEcoModeActive ? (
                          <>
                            <p className="text-xs text-muted-foreground">AI resource usage is minimized.</p>
                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 mt-1">
                              <li>File OCR will use local processing only.</li>
                              <li>AI answer validation in results will be manual.</li>
                            </ul>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Standard AI processing enabled (AI-powered OCR, auto-validation).</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {isEcoModeActive && (
                  <div className="p-2.5 mb-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-xs font-medium flex items-start gap-2">
                    <Leaf className="h-4 w-4 flex-shrink-0 mt-px text-green-500" />
                    <span>Eco Mode Active – AI minimized. Manual validation available in results. Local OCR will be used for images/PDFs.</span>
                  </div>
                )}
                {isApiKeyMissing && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">Please set your Gemini API key in the header to enable file uploads. An indicator will appear on the key icon.</span>
                  </div>
                )}
                <Input id="file-upload" type="file" multiple onChange={handleFileChange} accept=".txt,.pdf,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" className="pt-2 file:text-primary file:font-semibold" disabled={isProcessing || isApiKeyMissing || apiKeyLoading} />
                {isParsing && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {parseProgress.message}
                        {parseProgress.total > 1 && ` (${parseProgress.current} of ${parseProgress.total})`}
                    </p>
                    <Button variant="destructive" size="sm" onClick={stopParsing}>Stop</Button>
                  </div>
                )}
                {processedFiles.length > 0 && !isParsing && (
                  <div className="text-sm text-muted-foreground pt-2 space-y-2">
                    <strong>Uploaded files:</strong>
                    <ul className="list-disc pl-5 space-y-1 max-h-24 overflow-y-auto">
                      {processedFiles.map((file) => (
                        <li key={file.name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate" title={file.name}>{file.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(file.name)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
                 {form.formState.errors.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}

                {isEcoModeActive && processedFiles.length > 0 && !isParsing && (
                  <div className="mt-4 p-3 border border-dashed rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      Files were processed using local OCR in Eco Mode. For potentially higher accuracy or advanced analysis (like LaTeX extraction from complex images), you can switch off Eco Mode and re-upload/reprocess.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto whitespace-normal"
                      onClick={() => {
                        toggleEcoMode(); // This will turn Eco Mode OFF
                        toast({
                          title: "Eco Mode Deactivated",
                          description: "Please re-upload your files if you want them processed with AI OCR and analysis.",
                          duration: 7000,
                        });
                        // Note: We don't automatically reprocess here to avoid unexpected AI calls.
                        // User should re-initiate file upload if they want AI processing.
                        // Or, a more advanced implementation could clear processedFiles and prompt re-upload.
                        // For now, this informs the user.
                      }}
                    >
                      Switch to Full AI Mode & Guide Reprocessing
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-semibold">2. Configure Your Quiz</Label>
                <div className="p-4 border rounded-md space-y-4 bg-background/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
                    <FormField
                      control={form.control}
                      name="numQuestions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="h-6">Number of Questions</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (Number(value) > 100) {
                                        field.onChange(100);
                                    } else if (Number(value) < 1 && value !== '') {
                                        field.onChange(1);
                                    }
                                    else {
                                        field.onChange(value);
                                    }
                                }}
                                max="100"
                                className="pr-16"
                                disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                              />
                            </FormControl>
                            <Button
                                type="button"
                                variant="ghost"
                                className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3 hover:bg-muted/50"
                                onClick={() => form.setValue('numQuestions', 100, { shouldValidate: true })}
                                disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                            >
                                Max
                            </Button>
                          </div>
                          {isClient && <FormMessage />}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timerPerQuestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            htmlFor="timer-input"
                            className="flex items-center gap-1.5 h-6"
                          >
                            <Timer className="h-4 w-4" />
                            Timer per Question (sec)
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input
                                id="timer-input"
                                type="number"
                                placeholder="e.g. 30"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? undefined
                                      : +e.target.value
                                  )
                                }
                                value={field.value ?? ""}
                                min="0"
                                disabled={
                                  !timerEnabled ||
                                  isProcessing ||
                                  isApiKeyMissing ||
                                  apiKeyLoading
                                }
                                className={cn(!timerEnabled && "bg-muted/50")}
                              />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name="timerEnabled"
                              render={({ field: switchField }) => (
                                <FormControl>
                                  <Switch
                                    checked={switchField.value}
                                    onCheckedChange={switchField.onChange}
                                    disabled={
                                      isProcessing ||
                                      isApiKeyMissing ||
                                      apiKeyLoading
                                    }
                                    aria-controls="timer-input"
                                  />
                                </FormControl>
                              )}
                            />
                          </div>
                          {isClient && <FormMessage />}
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="relative rounded-md overflow-hidden border">
                     <div className={cn(
                        "absolute inset-0",
                        "bg-gradient-to-r from-amber-400 via-red-500 to-yellow-500",
                        "animate-supercharged-border bg-[length:400%_400%]",
                        "transition-opacity opacity-0",
                        isHellBound && "opacity-70"
                      )}></div>
                    <div className="relative flex items-center space-x-4 p-4">
                      <PulsingCoreRed className="h-10 w-10 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="hell-bound-mode" className={cn("font-bold", isHellBound ? "text-destructive-foreground" : "text-destructive")}>HELL BOUND MODE</Label>
                        <p className={cn("text-xs", isHellBound ? "text-destructive-foreground/80" : "text-muted-foreground")}>Generate an extremely difficult quiz to truly test your knowledge.</p>
                      </div>
                      <Switch
                        id="hell-bound-mode"
                        checked={isHellBound}
                        onCheckedChange={onHellBoundToggle}
                        disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                      />
                    </div>
                  </div>
                  {!isHellBound && (
                    <div className="space-y-4 animate-in fade-in-0 duration-300">
                      <FormField
                        control={form.control}
                        name="questionFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question Format</FormLabel>
                            <Select
                              onValueChange={field.onChange} // Simplified: removeProblemImage call removed
                              defaultValue={field.value}
                              disabled={isProcessing || isApiKeyMissing || apiKeyLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="multipleChoice">Multiple Choice</SelectItem>
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={cn( (isAnalyzingContent || canGenerateCalculative === false) && "cursor-not-allowed")}>
                                        <SelectItem
                                          value="problemSolving"
                                          disabled={isAnalyzingContent || canGenerateCalculative === false || isProcessing || isApiKeyMissing || apiKeyLoading}
                                          onSelect={(e) => {
                                            if (isAnalyzingContent || canGenerateCalculative === false) {
                                              e.preventDefault();
                                            } else {
                                              field.onChange("problemSolving");
                                            }
                                          }}
                                        >
                                          Problem Solving (Calculative)
                                          {isAnalyzingContent && <Loader2 className="h-4 w-4 animate-spin ml-2 inline-block" />}
                                        </SelectItem>
                                      </div>
                                    </TooltipTrigger>
                                    {(isAnalyzingContent || canGenerateCalculative === false) && (
                                      <TooltipContent>
                                        <p>
                                          {isAnalyzingContent
                                            ? "Analyzing content for calculative potential..."
                                            : "Disabled: No mathematical formulas/expressions detected in your uploaded content suitable for calculative problems."}
                                        </p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                                <SelectItem value="openEnded">Open-Ended (Conceptual)</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                            {isClient && <FormMessage />}
                          </FormItem>
                        )}
                      />
                      {/* Conditional UI for Problem Image Upload has been REMOVED */}
                      <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing || isApiKeyMissing || apiKeyLoading}>
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
                            {isClient && <FormMessage />}
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full text-lg py-6" disabled={isProcessing || processedFiles.length === 0 || isApiKeyMissing || apiKeyLoading}>
                {isApiKeyMissing && !apiKeyLoading ? (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    API Key Required
                  </>
                ) : isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing files...
                  </>
                ) : isAnalyzingContent ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing content...
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
    </div>
  );
}
