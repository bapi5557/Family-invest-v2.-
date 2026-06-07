
'use server';
/**
 * @fileOverview A Genkit flow for extracting expense data from receipt images or handwritten notes.
 *
 * - scanReceipt - A function that handles the AI vision extraction process.
 * - ScanReceiptInput - The input type for the scanReceipt function.
 * - ScanReceiptOutput - The return type for the scanReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt or handwritten expense note, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

const ExtractedExpenseItemSchema = z.object({
  category: z.string().describe('The predicted expense category from the ledger list.'),
  amount: z.number().describe('The identified amount spent.'),
  description: z.string().describe('A brief summary of what was purchased.'),
  date: z.number().describe('The timestamp of the expense (use current if not found).'),
});

const ScanReceiptOutputSchema = z.object({
  expenses: z.array(ExtractedExpenseItemSchema).describe('An array of identified expense items from the image.'),
  isReceipt: z.boolean().describe('Whether the image was identified as a valid expense record.'),
  summary: z.string().describe('A friendly AI summary of the scan.'),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput> {
  return scanReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: { schema: ScanReceiptInputSchema },
  output: { schema: ScanReceiptOutputSchema },
  prompt: `You are an expert AI Ledger Assistant for a family.
Your task is to analyze the provided image, which could be a printed store receipt or a handwritten list of household expenses.

Instructions:
1. Identify all individual expense items.
2. Extract the amount spent for each.
3. Categorize each item into standard household categories (e.g., Groceries, Petrol, Food, Medicines, Electricity Bill, Entertainment).
4. Provide a clear description for each.
5. If a date is visible, extract it as a timestamp. If not, use the current time ({{currentTime}}).
6. If the image is not related to expenses, set isReceipt to false.

Image: {{media url=photoDataUri}}`,
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      ...input,
      currentTime: Date.now(),
    });
    return output!;
  }
);
