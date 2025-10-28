'use server';

/**
 * @fileOverview An AI agent to analyze supplier data from a CSV file and provide insights.
 *
 * - evaluateSellerData - A function that handles the data analysis process.
 * - EvaluateSellerDataInput - The input type for the evaluateSellerData function.
 * - EvaluateSellerDataOutput - The return type for the evaluateSellerData function.
 */

import { z } from 'zod';
import { generateWithHunyuan } from '@/ai/hunyuan-client';
// csvtojson exports a default function; import as default for callable converter
import csv from 'csvtojson';

const EvaluateSellerDataInputSchema = z.object({
  csvDataUri: z
    .string()
    .describe(
      'The CSV data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
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
  try {
    const { csvDataUri, supplierId } = input;
    
    // Decode CSV data
    const csvString = csvDataUri.split(',')[1];
    const csvBuffer = Buffer.from(csvString, 'base64');
    const csvContent = csvBuffer.toString('utf-8');
    const jsonData: Array<Record<string, unknown>> = await (csv as any)().fromString(csvContent);

    // Prepare AI prompt
    const systemPrompt = `You are an AI assistant specialized in analyzing and qualifying e-commerce suppliers based on data.
The user is a platform that connects unique demands with high-quality suppliers.

Analyze each item in the provided JSON data, which represents a list of potential suppliers.
For each supplier, perform the following tasks:
1. Identify the company's name and its business category.
2. Based on the provided data (like specialty, products, description), evaluate how well they fit a platform that prioritizes "innovation", "customization", and "high-quality products".
3. Assign a 'matchScore' from 0 (poor fit) to 100 (perfect fit). A good fit would be a company in tech, custom manufacturing, unique design, etc. A poor fit would be a generic reseller or bulk commodity provider.
4. Provide a brief 'recommendation' or summary explaining your score.

You MUST respond with a valid JSON object in this exact format:
{
  "processedSuppliers": [
    {
      "name": "Company Name",
      "category": "Business Category",
      "matchScore": 85,
      "recommendation": "Brief explanation of the score"
    }
  ]
}`;

    const userPrompt = `The JSON data to analyze is:
${JSON.stringify(jsonData, null, 2)}

Please analyze each supplier and provide your evaluation.`;

    const result = await generateWithHunyuan({
      model: 'hunyuan-lite',
      messages: [
        { Role: 'system', Content: systemPrompt },
        { Role: 'user', Content: userPrompt },
      ],
      temperature: 0.7,
      userId: supplierId,
      actionType: 'supplier_data_analysis',
    });

    // Parse AI response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as EvaluateSellerDataOutput;
      
      if (!parsed.processedSuppliers || !Array.isArray(parsed.processedSuppliers)) {
        throw new Error('Invalid supplier analysis format');
      }

      // Validate each supplier has required fields
      const validSuppliers = parsed.processedSuppliers.filter(s => 
        s.name && s.category && typeof s.matchScore === 'number' && s.recommendation
      );

      if (validSuppliers.length === 0) {
        throw new Error('No valid supplier analysis found');
      }

      return {
        processedSuppliers: validSuppliers,
      };
    } catch (parseError) {
      console.error('Failed to parse AI supplier analysis:', parseError);
      console.error('AI response was:', result.text);
      
      // Fallback: Create basic analysis from raw data
      const fallbackSuppliers = jsonData.slice(0, 10).map((item: any) => ({
        name: item.name || item.company || item.供应商名称 || 'Unknown',
        category: item.category || item.类别 || item.业务类型 || 'General',
        matchScore: 50, // Neutral score
        recommendation: 'Automatic analysis failed. Manual review recommended.',
      }));

      return {
        processedSuppliers: fallbackSuppliers,
      };
    }
  } catch (error) {
    console.error('Error in evaluateSellerData:', error);
    throw error;
  }
}
