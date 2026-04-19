'use server';
/**
 * @fileOverview An AI secretary that drafts personalized WhatsApp messages.
 *
 * - autoDraftWhatsAppMessage - A function that handles drafting WhatsApp messages.
 * - AutoDraftWhatsAppMessageInput - The input type for the autoDraftWhatsAppMessage function.
 * - AutoDraftWhatsAppMessageOutput - The return type for the autoDraftWhatsAppMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoDraftWhatsAppMessageInputSchema = z.object({
  guestName: z.string().describe("The name of the guest for whom the message is being drafted."),
  brideName: z.string().describe("The name of the sender (e.g., 'Bride Name')."),
  messageType: z.enum(['rsvp_reminder', 'gift_thank_you']).describe("The type of message to draft: 'rsvp_reminder' for an RSVP reminder, or 'gift_thank_you' for a thank you note."),
  giftDetails: z.string().optional().describe("Details about the gift received (e.g., 'the beautiful crystal vase'). Required if messageType is 'gift_thank_you'."),
  rsvpDate: z.string().optional().describe("The deadline for RSVP (e.g., 'September 15th'). Required if messageType is 'rsvp_reminder'."),
  tone: z.enum(['Formal', 'Casual', 'Funny']).describe("The desired tone for the message: 'Formal', 'Casual', or 'Funny'."),
}).superRefine((data, ctx) => {
  if (data.messageType === 'rsvp_reminder' && !data.rsvpDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "rsvpDate is required when messageType is 'rsvp_reminder'",
      path: ['rsvpDate'],
    });
  }
  if (data.messageType === 'gift_thank_you' && !data.giftDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "giftDetails is required when messageType is 'gift_thank_you'",
      path: ['giftDetails'],
    });
  }
});
export type AutoDraftWhatsAppMessageInput = z.infer<typeof AutoDraftWhatsAppMessageInputSchema>;

const AutoDraftWhatsAppMessageOutputSchema = z.object({
  whatsappMessage: z.string().describe("The drafted personalized WhatsApp message."),
});
export type AutoDraftWhatsAppMessageOutput = z.infer<typeof AutoDraftWhatsAppMessageOutputSchema>;

export async function autoDraftWhatsAppMessage(input: AutoDraftWhatsAppMessageInput): Promise<AutoDraftWhatsAppMessageOutput> {
  return autoDraftWhatsAppMessageFlow(input);
}

const autoDraftWhatsAppMessagePrompt = ai.definePrompt({
  name: 'autoDraftWhatsAppMessagePrompt',
  input: {schema: AutoDraftWhatsAppMessageInputSchema},
  output: {schema: AutoDraftWhatsAppMessageOutputSchema},
  prompt: `You are an AI bride's secretary tasked with drafting a personalized WhatsApp message.

Recipient: {{guestName}}
Sender: {{brideName}}

Message Type: {{messageType}}
{{#if rsvpDate}}RSVP Deadline: {{rsvpDate}}{{/if}}
{{#if giftDetails}}Gift Details: {{giftDetails}}{{/if}}

Desired Tone: {{tone}}

Please draft a concise WhatsApp message based on the information provided above.
Consider the message type (RSVP reminder or gift thank you), any specific details (RSVP deadline or gift description), and the requested tone (Formal, Casual, or Funny).
`,
});

const autoDraftWhatsAppMessageFlow = ai.defineFlow(
  {
    name: 'autoDraftWhatsAppMessageFlow',
    inputSchema: AutoDraftWhatsAppMessageInputSchema,
    outputSchema: AutoDraftWhatsAppMessageOutputSchema,
  },
  async (input) => {
    const {output} = await autoDraftWhatsAppMessagePrompt(input);
    if (!output) {
      throw new Error('Failed to generate WhatsApp message.');
    }
    return output;
  }
);
