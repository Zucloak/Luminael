
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useUser } from "@/hooks/use-user";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  studentId: z.string().min(1, "Student ID is required.").max(20, "Student ID is too long."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, saveUser, clearUser, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const { isHellBound, loading: themeLoading } = useTheme();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", studentId: "" },
    values: user || { name: "", studentId: "" },
  });

  function onSubmit(data: ProfileFormValues) {
    saveUser(data);
    toast({
      title: "Profile Saved",
      description: "Your information has been updated successfully.",
    });
    router.push('/');
  }

  function handleLogout() {
    clearUser();
    toast({
      title: "Logged Out",
      description: "Your profile information has been cleared.",
    });
    form.reset({ name: "", studentId: "" });
  }

  const loading = userLoading || themeLoading;

  if (loading) {
    return (
      <div className={cn("theme-container min-h-screen flex flex-col bg-background transition-colors duration-1000", isHellBound && "hell-bound")}>
        <Header isHellBound={isHellBound} />
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Card className="max-w-2xl mx-auto w-full">
            <CardHeader>
              <Skeleton className="h-8 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </main>
        <footer className="text-center p-4 text-sm text-muted-foreground">
            <p>
            A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
            </p>
        </footer>
      </div>
    );
  }

  return (
    <div className={cn("theme-container min-h-screen flex flex-col bg-background transition-colors duration-1000", isHellBound && "hell-bound")}>
      <Header isHellBound={isHellBound} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
        <div className="relative w-full max-w-2xl mx-auto">
          {isHellBound && (
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 opacity-60 blur-2xl animate-background-pan bg-[length:200%_auto]" />
          )}
          <Card className={cn(
              "w-full relative",
              isHellBound ? "bg-card/80 backdrop-blur-sm border-0" : "shadow-lg"
            )}>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">User Profile</CardTitle>
              <CardDescription>
                Manage your personal information. This is stored only in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Jane Doe" {...field} />
                        </FormControl>
                        <FormDescription>Your full name.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 12345678" {...field} />
                        </FormControl>
                        <FormDescription>Your student identification number.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between items-center">
                    <Button type="submit">Save Profile</Button>
                    {user && (
                      <Button type="button" variant="ghost" onClick={handleLogout}>
                        Clear Profile Data
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        <p>
          A Prototype from <a href="https://synappse.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-foreground">SYNAPPSE</a> | Developer/CEO: Mr. K. M.
        </p>
      </footer>
    </div>
  );
}
