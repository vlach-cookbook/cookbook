import { getLogin } from '@lib/login-cookie';
import { PrismaClient, Recipe, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import type { APIRoute } from "astro";

const prisma = new PrismaClient();

interface JsonRecipe {
  dateCreated?: string;
  name: string;
  recipeCategory?: (string)[];
  recipeIngredient?: (JsonRecipeIngredient)[];
  recipeInstructions: string[];
  recipeYield?: string;
}
interface JsonRecipeIngredient {
  name?: string;
  quantity?: string;
  unit?: string;
  preparation?: string;
}

async function importCategories(recipes: JsonRecipe[]): Promise<void> {
  const categories = new Set<string>();
  for (const recipe of recipes) {
    if (!recipe.recipeCategory) continue;
    for (const category of recipe.recipeCategory) {
      categories.add(category);
    }
  }
  await prisma.category.createMany({
    data: Array.from(categories.keys()).map((name) => ({ name })),
    skipDuplicates: true
  });
}

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
}

function createRecipes(recipes: JsonRecipe[], user: User): Promise<Recipe>[] {
  return recipes.map(recipe => {
    return prisma.recipe.create({
      data: {
        name: recipe.name,
        author: { connect: { id: user.id } },
        slug: slugify(recipe.name),
        createdAt: recipe.dateCreated ? new Date(recipe.dateCreated) : undefined,
        servings: parseOptionalInt(recipe.recipeYield),
        ingredients: {
          create: recipe.recipeIngredient?.map(ingredient => {
            if (!ingredient.name) throw new Error(`Missing ingredient name in recipe ${JSON.stringify(recipe, undefined, 2)}`);
            return {
              amount: ingredient.quantity,
              unit: ingredient.unit,
              ingredient: ingredient.name,
              preparation: ingredient.preparation,
            };
          })
        },
        categories: { connect: recipe.recipeCategory?.map(name => ({ name })) },
        steps: recipe.recipeInstructions,
      }
    });
  });
}

export const post: APIRoute = async ({ request, cookies }) => {
  const user = await getLogin(cookies);

  if (!user) {
    return new Response("Must be logged in to import recipes.", { status: 403 });
  }

  const recipes: JsonRecipe[] = await request.json();

  try {
    await importCategories(recipes);
  } catch (e: any) {
    return {
      status: 500,
      body: "stack" in e ? `${String(e)}: ${e.stack}` : String(e)
    };
  }

  let responseBody: { createdCount: number; errors: string[] } = {
    createdCount: 0,
    errors: [],
  };
  let i = -1;
  for (const result of await Promise.allSettled(createRecipes(recipes, user))) {
    i++;
    switch (result.status) {
      case "fulfilled":
        responseBody.createdCount++;
        break;
      case "rejected":
        if (result.reason instanceof PrismaClientKnownRequestError && result.reason.code === "P2002") {
          // The recipe was just already inserted.
          continue;
        }
        responseBody.errors.push(`Error in recipe ${JSON.stringify(recipes[i], undefined, 2)}:\n${String(result.reason)}`);
        break;
    }
  }

  return {
    status: responseBody.errors.length > 0 ? 500 : 200,
    headers: {
      'content-type': 'text/html'
    },
    body: `Created ${responseBody.createdCount} recipes.

Errors:
${responseBody.errors.map(reason => `<pre>${reason}</pre>`)}
`
  }
}
