
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
    {
        question: "What is Luminael AI?",
        answer: "Luminael AI is a smart learning assistant designed to help you master any subject. You upload your study materials (like notes, textbook chapters, or articles), and the AI generates a custom quiz to test your knowledge and reinforce your learning."
    },
    {
        question: "How does the quiz generation work?",
        answer: "Luminael's AI engine performs a deep analysis of your uploaded files to build a conceptual understanding of the material. It intelligently identifies the most critical topics and relationships within your content. This understanding is then used as a blueprint to generate a focused, relevant quiz designed to test true comprehension, not just memorization."
    },
    {
        question: "Is my API key secure?",
        answer: "Absolutely. Your Google Gemini API key is stored exclusively in your browser's local storage. It is never sent to our servers or seen by us. It's used directly from your browser to make calls to Google's AI, ensuring your key remains private."
    },
    {
        question: "What file types are supported?",
        answer: "You can upload text files (.txt), Markdown files (.md), PDFs (.pdf), and common image files (.png, .jpg, .jpeg). For images and scanned PDFs, we use a combination of local and AI-powered text recognition (OCR) to extract the content."
    },
    {
        question: "What is Hell Bound Mode?",
        answer: "Hell Bound Mode is for when you want a true challenge. It instructs the AI to generate an extremely difficult quiz based on your content, focusing on complex topics and creating tricky distractors for multiple-choice questions. It's designed to push your understanding to its limits."
    },
    {
        question: "Who is SYNAPPSE?",
        answer: "SYNAPPSE is the innovative digital creation company behind Luminael AI, founded and led by Mr. K. M. We specialize in building intelligent applications and providing top-tier digital content and design services. You can learn more at synappse.vercel.app."
    }
];

export default function FaqPage() {
  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
        <Card className="w-full relative shadow-lg">
            <CardHeader className="text-center items-center">
                <HelpCircle className="h-10 w-10 text-primary" />
                <CardTitle className="font-headline text-3xl mt-4">Frequently Asked Questions</CardTitle>
                <CardDescription>
                    Have questions? We've got answers.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    </div>
  );
}
