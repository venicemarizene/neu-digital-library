'use server';
/**
 * @fileOverview An AI tool for providing personalized document recommendations to newly onboarded students.
 *
 * - personalizedDocumentRecommendations - A function that generates document recommendations based on the student's undergraduate program.
 * - PersonalizedDocumentRecommendationsInput - The input type for the personalizedDocumentRecommendations function.
 * - PersonalizedDocumentRecommendationsOutput - The return type for the personalizedDocumentRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedDocumentRecommendationsInputSchema = z.object({
  undergraduateProgram: z
    .string()
    .describe('The undergraduate program the student has selected.'),
});
export type PersonalizedDocumentRecommendationsInput = z.infer<
  typeof PersonalizedDocumentRecommendationsInputSchema
>;

const RecommendedDocumentSchema = z.object({
  title: z.string().describe('The title of the recommended document.'),
  description: z
    .string()
    .describe('A brief description of the document and its relevance.'),
});

const PersonalizedDocumentRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(RecommendedDocumentSchema)
    .describe('A list of personalized document recommendations.'),
});
export type PersonalizedDocumentRecommendationsOutput = z.infer<
  typeof PersonalizedDocumentRecommendationsOutputSchema
>;

export async function personalizedDocumentRecommendations(
  input: PersonalizedDocumentRecommendationsInput
): Promise<PersonalizedDocumentRecommendationsOutput> {
  return personalizedDocumentRecommendationsFlow(input);
}

const personalizedDocumentRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedDocumentRecommendationsPrompt',
  input: {schema: PersonalizedDocumentRecommendationsInputSchema},
  output: {schema: PersonalizedDocumentRecommendationsOutputSchema},
  prompt: `You are an AI assistant designed to provide personalized document recommendations to new university students.
Your goal is to help students quickly find essential resources relevant to their chosen undergraduate program.

Based on the student's undergraduate program, provide a list of 3-5 recommended documents.
For each document, include a title and a brief description explaining why it is relevant and useful.

Undergraduate Program: {{{undergraduateProgram}}}`,
});

const personalizedDocumentRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedDocumentRecommendationsFlow',
    inputSchema: PersonalizedDocumentRecommendationsInputSchema,
    outputSchema: PersonalizedDocumentRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedDocumentRecommendationsPrompt(input);
    return output!;
  }
);
