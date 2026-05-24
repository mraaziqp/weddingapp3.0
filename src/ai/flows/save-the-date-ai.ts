'use server';
/**
 * @fileOverview AI flows for the Save the Date Studio.
 * - generateSaveDateCopy   → romantic card copy
 * - generateSaveDateGradient → AI-chosen CSS background gradient
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ── Copy generation ────────────────────────────────────────────────────────────

const CopyInputSchema = z.object({
  partner1: z.string(),
  partner2: z.string(),
  date: z.string(),
  venue: z.string(),
  city: z.string(),
  style: z.enum(['romantic', 'playful', 'elegant', 'religious', 'modern']),
  field: z.enum(['headline', 'sub', 'verse', 'tagline']),
});
export type CopyInput = z.infer<typeof CopyInputSchema>;

const CopyOutputSchema = z.object({
  text: z.string().describe('The generated text, ready to place on the card.'),
});

const copyFlow = ai.defineFlow(
  { name: 'saveDateCopyFlow', inputSchema: CopyInputSchema, outputSchema: CopyOutputSchema },
  async (input) => {
    const fieldDescriptions: Record<CopyInput['field'], string> = {
      headline: 'A short (2-6 word) headline or title for the card.',
      sub: 'A one-line subtitle or tagline (6-12 words).',
      verse: 'A short romantic verse or quote (1-3 lines) for a wedding save the date.',
      tagline: 'A warm, brief call-to-action phrase like "Mark your calendars!" (5-10 words).',
    };

    const response = await ai.generate({
      prompt: `You are a wedding stationery copywriter. 
Write a ${input.style} "${input.field}" piece for a wedding save the date card.

Couple: ${input.partner1} & ${input.partner2}
Date: ${input.date}
Venue: ${input.venue}, ${input.city}

Field: ${fieldDescriptions[input.field]}

Return only the text itself — no quotes, no explanation, no markdown.`,
    });

    return { text: response.text.trim() };
  }
);

export async function generateSaveDateCopy(input: CopyInput): Promise<{ text: string }> {
  return copyFlow(input);
}

// ── Gradient/background suggestion ────────────────────────────────────────────

const GradientInputSchema = z.object({
  mood: z.string().describe('A description of the desired mood or aesthetic.'),
});
export type GradientInput = z.infer<typeof GradientInputSchema>;

const GradientOutputSchema = z.object({
  cssBackground: z.string().describe('A valid CSS background property value using linear-gradient or radial-gradient.'),
  name: z.string().describe('A beautiful 2-4 word name for this theme.'),
});

const gradientFlow = ai.defineFlow(
  { name: 'saveDateGradientFlow', inputSchema: GradientInputSchema, outputSchema: GradientOutputSchema },
  async (input) => {
    const response = await ai.generate({
      output: { schema: GradientOutputSchema },
      prompt: `You are a luxury wedding stationery designer.
A user wants an AI-generated background for their save the date card.

Their mood/aesthetic: "${input.mood}"

Generate a beautiful CSS background value using linear-gradient or radial-gradient with 2-4 color stops.
Use rich, wedding-appropriate colors. Return valid CSS only.

Also give it a beautiful 2-4 word theme name.`,
    });
    return response.output as z.infer<typeof GradientOutputSchema>;
  }
);

export async function generateSaveDateGradient(input: GradientInput): Promise<z.infer<typeof GradientOutputSchema>> {
  return gradientFlow(input);
}
