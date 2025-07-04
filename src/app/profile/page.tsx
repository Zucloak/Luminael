"use client"; // Required for hooks and event handlers

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { aggregateAllUserData, restoreAllUserData } from "@/lib/userDataManager";
import { getPastQuizzes } from "@/lib/indexed-db"; // For fetching quiz data
import { calculateQuizAnalytics } from "@/lib/analyticsUtils"; // For calculating analytics
import type { UserDeviceData, QuizAnalyticsData, PastQuiz } from "@/lib/types"; // Include new types
import { BrainCircuit, Sparkles, ShieldCheck, Mail, History, KeyRound, Save, FolderOpen, Loader2, HardDriveDownload, LineChart as LineChartIcon, BarChart2 } from 'lucide-react'; // Added LineChartIcon, BarChart2, removed HardDriveUpload
import { patchNotes } from '@/lib/patch-notes';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'; // Recharts components
import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect } from 'react';

// Helper type for File System Access API directory handle
type DirectoryHandle = any; // FileSystemDirectoryHandle - using any for broader compatibility if not fully typed

export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [isLoadingLoad, setIsLoadingLoad] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<DirectoryHandle | null>(null);
  const [directoryName, setDirectoryName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyticsData, setAnalyticsData] = useState<QuizAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Effect for loading directory name (from local data management)
  useEffect(() => {
    const storedName = localStorage.getItem("luminaelDirectoryName");
    if (storedName && ('showDirectoryPicker' in window)) {
        setDirectoryName(storedName);
    }
  }, []);

  // Effect for loading and calculating quiz analytics
  useEffect(() => {
    async function loadAndProcessAnalytics() {
      setIsLoadingAnalytics(true);
      try {
        const pastQuizzes = await getPastQuizzes();
        if (pastQuizzes && pastQuizzes.length > 0) {
          const calculatedData = calculateQuizAnalytics(pastQuizzes);
          setAnalyticsData(calculatedData);
        } else {
          setAnalyticsData({ quizCountsPerWeek: [], averageScoresPerWeek: [] }); // Empty data
        }
      } catch (error) {
        console.error("Failed to load or calculate analytics:", error);
        toast({ title: "Analytics Error", description: "Could not load quiz analytics.", variant: "destructive" });
        setAnalyticsData(null); // Error state
      }
      setIsLoadingAnalytics(false);
    }
    loadAndProcessAnalytics();
  }, [toast]);


  const handleSaveData = async () => {
    setIsLoadingSave(true);
    try {
      const data = await aggregateAllUserData();
      const jsonData = JSON.stringify(data, null, 2);
      const fileName = "luminael_user_data.json";

      if ('showDirectoryPicker' in window) {
        try {
          let dirHandle = directoryHandle;
          if (!dirHandle) {
            dirHandle = await (window as any).showDirectoryPicker();
            setDirectoryHandle(dirHandle);
            setDirectoryName(dirHandle.name);
            // localStorage.setItem("luminaelDirectoryHandle", JSON.stringify(dirHandle)); // Not directly serializable
            localStorage.setItem("luminaelDirectoryName", dirHandle.name); // Store name
          }

          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonData);
          await writable.close();
          toast({ title: "Data Saved", description: `User data saved to ${dirHandle.name}/${fileName}` });
        } catch (err: any) {
          if (err.name === 'AbortError') {
            toast({ title: "Save Cancelled", description: "Directory selection was cancelled.", variant: "default" });
          } else {
            console.error("Error using File System Access API for save:", err);
            toast({ title: "Save Error", description: "Could not save data using File System Access API. Falling back to download.", variant: "destructive" });
            downloadFallback(jsonData, fileName);
          }
        }
      } else {
        downloadFallback(jsonData, fileName);
      }
    } catch (error) {
      console.error("Failed to aggregate or save data:", error);
      toast({ title: "Error", description: "Could not prepare data for saving.", variant: "destructive" });
    }
    setIsLoadingSave(false);
  };

  const downloadFallback = (jsonData: string, fileName: string) => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Data Downloading", description: `User data is being downloaded as ${fileName}. Please select a location.` });
  };

  const handleLoadData = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Luminael Data', accept: { 'application/json': ['.json'] } }],
        });
        const file = await fileHandle.getFile();
        await processFile(file);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          toast({ title: "Load Cancelled", description: "File selection was cancelled.", variant: "default" });
        } else {
          console.error("Error using File System Access API for load:", err);
          toast({ title: "Load Error", description: "Could not load data using File System Access API. Try the fallback.", variant: "destructive" });
          // Optionally trigger fallback file input here if desired
        }
      }
    } else {
      // Fallback for browsers not supporting File System Access API
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    await processFile(file);
     // Reset file input to allow selecting the same file again
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    setIsLoadingLoad(true);
    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent) as UserDeviceData;

      // Basic validation
      if (typeof data.dataVersion !== 'number' || !Array.isArray(data.pastQuizzes)) {
         throw new Error("Invalid data format.");
      }

      await restoreAllUserData(data);
      toast({ title: "Data Restored", description: "User data has been successfully restored. Please reload the page to see changes." });
      // Consider a full page reload or state refresh here if necessary
      // window.location.reload(); // Or use Next.js router for softer navigation if state updates correctly
    } catch (error) {
      console.error("Failed to load or restore data:", error);
      toast({ title: "Error Restoring Data", description: `Could not restore data. ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
    setIsLoadingLoad(false);
  };


  return (
    <div className="relative w-full max-w-2xl mx-auto">
        <Card className="w-full relative shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">Welcome, Pioneer!</CardTitle>
                <CardDescription>
                You're at the forefront of AI-powered learning. Here's what's new and how we're building a smarter tool for you.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* Quiz Analytics Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-primary" /> Your Progress
                    </h3>
                    <div className="p-4 rounded-md border bg-muted/30">
                        {isLoadingAnalytics && <p className="text-sm text-muted-foreground">Loading analytics...</p>}
                        {!isLoadingAnalytics && analyticsData && (analyticsData.quizCountsPerWeek.length > 0 || analyticsData.averageScoresPerWeek.length > 0) ? (
                            <>
                                <p className="text-xs text-muted-foreground/80 mb-4">
                                    Analytics are based on your saved quiz history. Charts show weekly trends.
                                </p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-center text-sm">Quizzes Taken Per Week</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={analyticsData.quizCountsPerWeek} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.5}/>
                                                <XAxis dataKey="date" fontSize={10} />
                                                <YAxis allowDecimals={false} fontSize={10}/>
                                                <Tooltip contentStyle={{ fontSize: '12px', padding: '2px 8px' }} />
                                                <Bar dataKey="count" name="Quizzes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-center text-sm">Average Score Per Week (%)</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={analyticsData.averageScoresPerWeek} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.5}/>
                                                <XAxis dataKey="date" fontSize={10} />
                                                <YAxis domain={[0, 100]} fontSize={10}/>
                                                <Tooltip contentStyle={{ fontSize: '12px', padding: '2px 8px' }} formatter={(value: number | null, name: string, props: any) => [`${value}% on ${props.payload.quizCountWithScores} quiz(zes)`, "Avg Score"]} />
                                                <Line type="monotone" dataKey="averageScore" name="Avg Score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            !isLoadingAnalytics && <p className="text-sm text-muted-foreground">No quiz history yet to show analytics. Take some quizzes and save them to see your progress!</p>
                        )}
                         {!isLoadingAnalytics && !analyticsData && (
                            <p className="text-sm text-destructive">Could not load analytics data.</p>
                        )}
                    </div>
                </div>
                {/* End Quiz Analytics Section */}


                {/* Local Data Management Section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <HardDriveDownload className="h-5 w-5 text-primary" /> Local Data Management
                    </h3>
                    <div className="p-4 rounded-md border bg-muted/30 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Save your profile settings and quiz history to your device. You can then load this data back into Luminael, even on a different browser or if your browser data is cleared.
                        </p>
                        {directoryName && (
                            <p className="text-sm text-muted-foreground">
                                Current save directory: <span className="font-semibold text-foreground">{directoryName}</span> (selected via File System Access API). New saves will use this directory.
                            </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={handleSaveData} disabled={isLoadingSave || isLoadingLoad || isLoadingAnalytics} className="flex-1">
                                {isLoadingSave ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Data to Device
                            </Button>
                            <Button onClick={handleLoadData} disabled={isLoadingLoad || isLoadingSave || isLoadingAnalytics} variant="outline" className="flex-1">
                                {isLoadingLoad ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                                Load Data from Device
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground/80 pt-2">
                            If your browser supports the File System Access API, you'll be prompted to select a directory for saving. Otherwise, a JSON file will be downloaded. For loading, you can select a previously saved JSON file.
                        </p>
                    </div>
                </div>
                {/* End Local Data Management Section */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    accept=".json"
                    className="hidden"
                />


                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> The Luminael Method</h3>
                    <div className="p-4 rounded-md border bg-muted/30 space-y-4">
                        <div className="flex items-start gap-3">
                            <BrainCircuit className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                            <div>
                                <h4 className="font-semibold">Intelligent Content Processing</h4>
                                <p className="text-sm text-muted-foreground">Luminael uses a hybrid approach to understand your files. We use powerful on-device processing first, only calling on advanced AI when necessary. This saves your Gemini API quota while delivering fast, accurate results.</p>
                            </div>
                        </div>
                            <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                            <div>
                                <h4 className="font-semibold">Your Privacy is Paramount</h4>
                                <p className="text-sm text-muted-foreground">Your API key is stored exclusively in your browser—never on our servers. Uploaded study materials are processed for your quiz and then immediately discarded. Your data is yours alone.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> The Key to Your Engine</h3>
                        <div className="p-4 rounded-md border bg-muted/30">
                        <p className="text-sm text-muted-foreground">Think of Luminael as a high-performance vehicle, engineered to perfection. Your free Google Gemini API key is the only thing needed to get in the driver's seat and unlock its full potential. The generous free tier is more than enough to get you started on the road to mastery.</p>
                        <p className="text-sm mt-2">
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary">Get your free API Key and start your engine.</a>
                        </p>
                        </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> You are a Beta Tester</h3>
                        <div className="p-4 rounded-md border bg-muted/30">
                        <p className="text-sm text-muted-foreground">Your feedback is critical as we build the future of personalized education. If you find a bug or have a suggestion, please let us know.</p>
                        <p className="text-sm mt-2">
                            Send bug reports to: <a href="mailto:synpps@gmail.com" className="font-semibold underline hover:text-primary">synpps@gmail.com</a>
                        </p>
                        </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Version History</h3>
                    <Card className="w-full bg-background/50">
                        <CardContent className="p-0">
                            <ScrollArea className="h-72 w-full">
                                <Accordion type="single" collapsible defaultValue="item-0" className="p-4">
                                    {patchNotes.map((patch, index) => (
                                        <AccordionItem value={`item-${index}`} key={patch.version}>
                                            <AccordionTrigger>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold">Version {patch.version}: {patch.title}</span>
                                                    <span className="text-xs text-muted-foreground">{patch.date}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <ul className="space-y-3 pt-2">
                                                    {patch.notes.map((note, noteIndex) => (
                                                        <li key={noteIndex} className="flex items-start gap-3">
                                                            <div className="bg-muted p-1.5 rounded-full mt-1">
                                                                <note.icon className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                            <p className="text-sm text-muted-foreground flex-1"><span className="font-semibold text-foreground">{note.category}:</span> {note.text}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
