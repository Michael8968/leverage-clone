'use server';

/**
 * @fileOverview An AI agent to analyze supplier data from a CSV file and provide insights.
 *
 * - evaluateSellerData - A function that handles the data analysis process.
 * - EvaluateSellerDataInput - The input type for the evaluateSellerData function.
 * - EvaluateSellerDataOutput - The return type for the evaluateSellerData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as csv from 'csvtojson';

const EvaluateSellerDataInputSchema = z.object({
  csvDataUri: z
    .string()
    .describe(
      'The CSV data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // eslint-disable-line prettier/prettier
    ),
});

export type EvaluateSellerDataInput = z.infer<typeof EvaluateSellerDataInputSchema>;

const EvaluateSellerDataOutputSchema = z.object({
  insights: z.string().describe('AI-generated insights and recommendations to improve sales strategy.'),
});

export type EvaluateSellerDataOutput = z.infer<typeof EvaluateSellerDataOutputSchema>;

export async function evaluateSellerData(input: EvaluateSellerDataInput): Promise<EvaluateSellerDataOutput> {
  return evaluateSellerDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateSellerDataPrompt',
  input: {schema: EvaluateSellerDataInputSchema},
  output: {schema: EvaluateSellerDataOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing sales data for e-commerce suppliers.

  Analyze the data provided in the CSV format and provide actionable insights and recommendations to improve their sales strategy.

  Be concise and provide specific suggestions related to pricing, product offerings, marketing, etc.

  The CSV data is:

  {{csvData}}`,
});

const evaluateSellerDataFlow = ai.defineFlow(
  {
    name: 'evaluateSellerDataFlow',
    inputSchema: EvaluateSellerDataInputSchema,
    outputSchema: EvaluateSellerDataOutputSchema,
  },
  async input => {
    const csvString = input.csvDataUri.split(',')[1];
    const csvBuffer = Buffer.from(csvString, 'base64');
    const csvContent = csvBuffer.toString('utf-8');
    // Convert CSV content to JSON format
    const jsonData = await csv().fromString(csvContent);
    const {output} = await prompt({csvData: JSON.stringify(jsonData)});
    return output!;
  }
);
