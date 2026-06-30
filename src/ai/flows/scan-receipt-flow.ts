
'use server';
/**
 * @fileOverview High-sensitivity expense extraction flow.
 *
 * - scanReceipt - Direct multimodal OCR extraction for handwritten and printed ledgers.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractedExpenseItemSchema = z.object({
  category: z.string().describe('Predicted category (e.g. Petrol, Groceries, Food).'),
  amount: z.number().describe('Numeric amount found.'),
  description: z.string().describe('Short summary of the item.'),
  date: z.number().describe('Timestamp of the expense.'),
});

const ScanReceiptOutputSchema = z.object({
  expenses: z.array(ExtractedExpenseItemSchema).describe('All identified expense items.'),
  isReceipt: z.boolean().describe('Set to true if any text resembling an expense was found.'),
  summary: z.string().describe('Short AI feedback about what was found.'),
});

const ScanReceiptInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of a receipt or note as a data URI."),
});

/**
 * Extracts expense items from an image using Gemini Flash.
 */
export async function scanReceipt(input: z.infer<typeof ScanReceiptInputSchema>): Promise<z.infer<typeof ScanReceiptOutputSchema>> {
  return scanReceiptFlow(input);
}

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input) => {
    // Using gemini-flash-latest alias for maximum stability and resolution of 404 errors
    const result = await ai.generate({
      model: 'googleai/gemini-flash-latest',
      prompt: [
        {
          text: `You are an expert AI Ledger Assistant. 
          Read the provided image and extract every single expense item you can find.
          
          CRITICAL INSTRUCTIONS:
          1. Read ALL text, including handwritten notes like "500 petrol", "milk 40", or "shop 1200".
          2. If the image contains a list, extract EACH line as a separate expense item.
          3. For every item, identify:
             - Amount: The numeric price.
             - Category: Standard household category (Groceries, Petrol, Mobile, Food, etc).
             - Description: A brief note of what it was.
             - Date: EXPLICITLY look for any mentioned date in the handwriting or text (e.g. "12 Feb", "Jan 10", "15/01"). 
                     If a date is found, convert it to a numeric timestamp. 
                     If NO date is visible, use the current timestamp: ${Date.now()}.
          4. Be extremely sensitive to handwriting. Extract even tiny scribbles if they look like money.
          5. Set 'isReceipt' to true if you detected ANY valid expense information.`
        },
        {
          media: {
            url: input.photoDataUri,
            contentType: 'image/jpeg'
          }
        }
      ],
      output: { schema: ScanReceiptOutputSchema },
      config: {
        temperature: 0, // 0 is critical for accurate OCR and data extraction
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      }
    });

    if (!result.output) {
      throw new Error("AI could not process this image. Please try a clearer photo.");
    }

    return result.output;
  }
);
