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
    supplierId: z.string().describe('The ID of the supplier uploading the data.'),
});

export type EvaluateSellerDataInput = z.infer<typeof EvaluateSellerDataInputSchema>;

const ProcessedSupplierSchema = z.object({
    name: z.string().describe('The name of the company from the CSV row.'),
    category: z.string().describe('The business category of the company.'),
    matchScore: z.number().min(0).max(100).describe('An AI-generated score from 0-100 indicating how well this supplier matches the platform\'s needs.'),
    recommendation: z.string().describe('A brief recommendation or summary from the AI.'),
});

const EvaluateSellerDataOutputSchema = z.object({
  processedSuppliers: z.array(ProcessedSupplierSchema).describe('A list of processed supplier records with AI analysis.'),
});

export type EvaluateSellerDataOutput = z.infer<typeof EvaluateSellerDataOutputSchema>;

export async function evaluateSellerData(input: EvaluateSellerDataInput): Promise<EvaluateSellerDataOutput> {
  return evaluateSellerDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateSellerDataPrompt',
  input: {schema: z.object({ jsonData: z.string() })},
  output: {schema: EvaluateSellerDataOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing and qualifying e-commerce suppliers based on data.
  The user is a platform that connects unique demands with high-quality suppliers.

  Analyze each item in the following JSON data, which represents a list of potential suppliers.
  For each supplier, perform the following tasks:
  1.  Identify the company's name and its business category.
  2.  Based on the provided data (like specialty, products, description), evaluate how well they fit a platform that prioritizes "innovation", "customization", and "high-quality products".
  3.  Assign a 'matchScore' from 0 (poor fit) to 100 (perfect fit). A good fit would be a company in tech, custom manufacturing, unique design, etc. A poor fit would be a generic reseller or bulk commodity provider.
  4.  Provide a brief 'recommendation' or summary explaining your score.

  Return the entire list as a JSON object following the output schema.

  The JSON data is:
  {{{jsonData}}}
  `,
});

const evaluateSellerDataFlow = ai.defineFlow(
  {
    name: 'evaluateSellerDataFlow',
    inputSchema: EvaluateSellerDataInputSchema,
    outputSchema: EvaluateSellerDataOutputSchema,
  },
  async ({ csvDataUri, supplierId }) => {
    const csvString = csvDataUri.split(',')[1];
    const csvBuffer = Buffer.from(csvString, 'base64');
    const csvContent = csvBuffer.toString('utf-8');
    const jsonData = await csv().fromString(csvContent);

    // Call the AI to get the analysis
    const { output } = await prompt({ jsonData: JSON.stringify(jsonData) });
    if (!output) {
        throw new Error("AI analysis failed to return data.");
    }
    
    // In a real scenario, you might enrich the output with the supplierId before returning,
    // but here we assume the calling function will handle associating the data.
    return output;
  }
);
