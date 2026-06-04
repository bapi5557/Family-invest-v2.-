'use server';
/**
 * @fileOverview A Genkit flow for generating monthly household expense summaries and efficiency insights.
 *
 * - monthlyExpenseEfficiencySummary - A function that handles the generation of the monthly expense summary.
 * - MonthlyExpenseEfficiencySummaryInput - The input type for the monthlyExpenseEfficiencySummary function.
 * - MonthlyExpenseEfficiencySummaryOutput - The return type for the monthlyExpenseEfficiencySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MonthlyExpenseItemSchema = z.object({
  category: z.string().describe('The expense category (e.g., Groceries, Electric Bill).'),
  amount: z.number().describe('The amount spent for this expense item.'),
  description: z.string().optional().describe('A brief description of the expense.'),
});

const MonthlyExpenseEfficiencySummaryInputSchema = z.object({
  month: z.string().describe('The month for which to generate the summary (e.g., "January").'),
  year: z.number().describe('The year for which to generate the summary (e.g., 2024).'),
  expenses: z.array(MonthlyExpenseItemSchema).describe('An array of monthly expense items.'),
});
export type MonthlyExpenseEfficiencySummaryInput = z.infer<typeof MonthlyExpenseEfficiencySummaryInputSchema>;

const SpendingBreakdownItemSchema = z.object({
  category: z.string().describe('The expense category.'),
  amount: z.number().describe('The total amount spent in this category.'),
  percentage: z.number().describe('The percentage of total expenses this category represents.'),
});

const MonthlyExpenseEfficiencySummaryOutputSchema = z.object({
  summary: z.string().describe('An overall summary of the household expenses for the month.'),
  totalExpenses: z.number().describe('The calculated total expenses for the month.'),
  spendingBreakdown: z.array(SpendingBreakdownItemSchema).describe('A breakdown of spending by category.'),
  efficiencyInsights: z.array(z.string()).describe('Actionable insights into spending patterns.'),
  savingsRecommendations: z.array(z.string()).describe('Specific recommendations for potential savings.'),
});
export type MonthlyExpenseEfficiencySummaryOutput = z.infer<typeof MonthlyExpenseEfficiencySummaryOutputSchema>;

export async function monthlyExpenseEfficiencySummary(input: MonthlyExpenseEfficiencySummaryInput): Promise<MonthlyExpenseEfficiencySummaryOutput> {
  return monthlyExpenseEfficiencySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'monthlyExpenseEfficiencySummaryPrompt',
  input: { schema: MonthlyExpenseEfficiencySummaryInputSchema },
  output: { schema: MonthlyExpenseEfficiencySummaryOutputSchema },
  prompt: `You are an AI Insight Counselor for a family. Your task is to analyze the provided monthly household expenses and generate a comprehensive summary, including a spending breakdown, efficiency insights, and specific savings recommendations.\n\nHere are the expenses for {{month}} {{year}}:\n\nExpenses:\n{{#each expenses}}\n- Category: {{{category}}}, Amount: {{{amount}}}{{#if description}}, Description: {{{description}}}{{/if}}\n{{/each}}\n\nPlease provide a detailed analysis following the structure of the output schema.\nEnsure to calculate the 'totalExpenses' accurately and the 'percentage' for each category in 'spendingBreakdown'.\nIdentify at least 3 distinct efficiency insights and 3 specific savings recommendations based on the provided expense data.\n`,
});

const monthlyExpenseEfficiencySummaryFlow = ai.defineFlow(
  {
    name: 'monthlyExpenseEfficiencySummaryFlow',
    inputSchema: MonthlyExpenseEfficiencySummaryInputSchema,
    outputSchema: MonthlyExpenseEfficiencySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
