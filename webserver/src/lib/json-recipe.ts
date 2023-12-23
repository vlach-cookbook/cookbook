import z from 'zod';

export const JsonRecipeIngredient = z.object({
  name: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  preparation: z.string().optional(),
});
export type JsonRecipeIngredient = z.infer<typeof JsonRecipeIngredient>;

export const JsonRecipe = z.object({
  dateCreated: z.string().optional(),
  name: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  recipeCategory: z.string().array().optional().transform(c => c ?? []),
  recipeIngredient: JsonRecipeIngredient.array().optional().transform(i => i ?? []),
  recipeInstructions: z.string().array().optional().transform(i => i ?? []),
  recipeYield: z.string().optional(),
  error: z.string().optional(),
});
export type JsonRecipe = z.infer<typeof JsonRecipe>;
