"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bot,
  Clipboard,
  Loader2,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMessageAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";

const formSchema = z.object({
  guestName: z.string().min(1, "Guest name is required."),
  brideName: z.string().min(1, "Your name is required."),
  messageType: z.enum(['rsvp_reminder', 'gift_thank_you']),
  giftDetails: z.string().optional(),
  rsvpDate: z.string().optional(),
  toneValue: z.number().min(0).max(2).default(1),
}).superRefine((data, ctx) => {
    if (data.messageType === 'rsvp_reminder' && !data.rsvpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RSVP date is required for this message type.",
        path: ['rsvpDate'],
      });
    }
    if (data.messageType === 'gift_thank_you' && (!data.giftDetails || data.giftDetails.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gift details are required for this message type.",
        path: ['giftDetails'],
      });
    }
  });
  

type FormValues = z.infer<typeof formSchema>;

const tones = ["Formal", "Casual", "Funny"] as const;

const MotionButton = motion(Button);

function TypingEffect({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        setDisplayedText("");
        if (text) {
            let i = 0;
            const intervalId = setInterval(() => {
                setDisplayedText(text.slice(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(intervalId);
                }
            }, 20); // Adjust typing speed here
            return () => clearInterval(intervalId);
        }
    }, [text]);

    return <p style={{ whiteSpace: "pre-wrap" }}>{displayedText}</p>;
}


export function AiSecretaryForm() {
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      brideName: "Jane",
      messageType: "rsvp_reminder",
      giftDetails: "",
      rsvpDate: "",
      toneValue: 1,
    },
  });

  const messageType = form.watch("messageType");
  const toneValue = form.watch("toneValue");

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedMessage("");
    const tone = tones[values.toneValue] as 'Formal' | 'Casual' | 'Funny';
    
    const result = await generateMessageAction({ ...values, tone });

    if (result.success && result.message) {
      setGeneratedMessage(result.message);
      fireConfetti();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error || "An unexpected error occurred.",
      });
    }
    setIsLoading(false);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedMessage);
    toast({
      title: "Copied to clipboard!",
      description: "You can now paste the message in WhatsApp.",
    });
  }

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#f6e7b7', '#ffffff']
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid gap-8 lg:grid-cols-2"
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Message Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brideName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="messageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Select a message type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card">
                        <SelectItem value="rsvp_reminder">RSVP Reminder</SelectItem>
                        <SelectItem value="gift_thank_you">Gift Thank You</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {messageType === "rsvp_reminder" && (
                <FormField
                  control={form.control}
                  name="rsvpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RSVP Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {messageType === "gift_thank_you" && (
                <FormField
                  control={form.control}
                  name="giftDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gift Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., 'the beautiful crystal vase'" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="toneValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone: <span className="font-bold text-accent">{tones[toneValue]}</span></FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={2}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <FormDescription>Adjust from Formal to Funny.</FormDescription>
                  </FormItem>
                )}
              />
              <MotionButton 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium shadow-lg shadow-[#d4af37]/30 glossy-sweep"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Bot className="mr-2" />
                )}
                Generate Message
              </MotionButton>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="flex flex-col glass-card">
        <CardHeader>
          <CardTitle>Generated Message</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between">
          <div className="prose prose-sm min-h-[200px] w-full rounded-2xl border border-white/10 bg-black/20 p-4 prose-p:text-white">
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ) : generatedMessage ? (
                <TypingEffect text={generatedMessage} />
            ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mb-4" />
                    <p>Your drafted message will appear here.</p>
                </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <MotionButton
              variant="outline"
              onClick={copyToClipboard}
              disabled={!generatedMessage || isLoading}
              className="w-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Clipboard className="mr-2" /> Copy
            </MotionButton>
            <MotionButton
              disabled={!generatedMessage || isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const url = `https://wa.me/?text=${encodeURIComponent(generatedMessage)}`;
                window.open(url, "_blank");
              }}
            >
              <Send className="mr-2" /> Send via WhatsApp
            </MotionButton>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
