'use server';

import { supabaseAdmin } from "@/lib/supabase";
import { autoDraftWhatsAppMessage, type AutoDraftWhatsAppMessageInput } from "@/ai/flows/auto-draft-whatsapp-message";
import { generateSaveDateCopy, generateSaveDateGradient, type CopyInput, type GradientInput } from "@/ai/flows/save-the-date-ai";
import { z } from "zod";

// Re-defining schema here to avoid importing the whole flow file in the client component
const AutoDraftWhatsAppMessageInputSchema = z.object({
  guestName: z.string().min(1, "Guest name is required."),
  brideName: z.string().min(1, "Your name is required."),
  messageType: z.enum(['rsvp_reminder', 'gift_thank_you']),
  giftDetails: z.string().optional(),
  rsvpDate: z.string().optional(),
  tone: z.enum(['Formal', 'Casual', 'Funny']),
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


export async function generateMessageAction(values: AutoDraftWhatsAppMessageInput) {
    const validatedFields = AutoDraftWhatsAppMessageInputSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid input." };
    }

    try {
        const result = await autoDraftWhatsAppMessage(validatedFields.data);
        return { success: true, message: result.whatsappMessage };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate message. Please try again." };
    }
}

// ── Save the Date AI actions ──────────────────────────────────────────────────

export async function generateSaveDateCopyAction(input: CopyInput) {
    try {
        const result = await generateSaveDateCopy(input);
        return { success: true, text: result.text };
    } catch (error) {
        console.error('[STD-AI]', error);
        return { success: false, error: 'Failed to generate copy. Check your API key.' };
    }
}

export async function generateSaveDateGradientAction(input: GradientInput) {
    try {
        const result = await generateSaveDateGradient(input);
        return { success: true, cssBackground: result.cssBackground, name: result.name };
    } catch (error) {
        console.error('[STD-AI]', error);
        return { success: false, error: 'Failed to generate background.' };
    }
}

export async function submitRsvpAction(input: {
  householdId: string;
  rsvpStatus: 'Confirmed' | 'Regret';
  dietary: string;
  song: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('guests')
      .update({
        rsvp_status: input.rsvpStatus,
        dietary_restrictions: input.dietary || null,
        song_request: input.song || null,
        updated_at: new Date().toISOString(),
      })
      .eq('household_id', input.householdId);

    if (error) {
      console.error('[RSVP Action] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[RSVP Action] server error:', error);
    return { success: false, error: 'Internal server error.' };
  }
}

