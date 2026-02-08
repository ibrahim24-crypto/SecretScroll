'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest a category for a person based on their name and description.
 *
 * - suggestPersonCategory - A function that suggests a category for a person.
 * - SuggestPersonCategoryInput - The input type for the suggestPersonCategory function.
 * - SuggestPersonCategoryOutput - The return type for the suggestPersonCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPersonCategoryInputSchema = z.object({
  name: z.string().describe('The name of the person.'),
  description: z.string().describe('A short description of the person.'),
});
export type SuggestPersonCategoryInput = z.infer<typeof SuggestPersonCategoryInputSchema>;

const SuggestPersonCategoryOutputSchema = z.object({
  category: z
    .string()
    .describe(
      'The suggested category for the person, e.g., celebrity, politician, public_figure.'
    ),
});
export type SuggestPersonCategoryOutput = z.infer<typeof SuggestPersonCategoryOutputSchema>;

export async function suggestPersonCategory(
  input: SuggestPersonCategoryInput
): Promise<SuggestPersonCategoryOutput> {
  return suggestPersonCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPersonCategoryPrompt',
  input: {schema: SuggestPersonCategoryInputSchema},
  output: {schema: SuggestPersonCategoryOutputSchema},
  prompt: `You are an expert in categorizing people. Based on the following information, suggest the most appropriate category for the person. Possible categories are: celebrity, politician, public_figure.

Name: {{{name}}}
Description: {{{description}}}

Category:`,
});

const suggestPersonCategoryFlow = ai.defineFlow(
  {
    name: 'suggestPersonCategoryFlow',
    inputSchema: SuggestPersonCategoryInputSchema,
    outputSchema: SuggestPersonCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
