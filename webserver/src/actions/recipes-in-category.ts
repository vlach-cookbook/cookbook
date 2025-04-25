import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import type { CookingHistory, Prisma } from "@prisma/client";
import { defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";

export type RecipesInCategoryResponse = {
  name: string;
  slug: string;
  author: {
    username: string;
  };
  cookingHistory: CookingHistory[] | undefined;
}[];

const input = z.object({
  categoryIds: z.array(z.number().int()),
  author: z.string().optional(),
});
type Input = z.infer<typeof input>;

async function handler(
  { categoryIds, author }: Input,
  { cookies }: ActionAPIContext
): Promise<RecipesInCategoryResponse> {
  const activeUser = await getLogin(cookies);

  const where: Prisma.RecipeWhereInput = {
    categories: {
      some: {
        id: { in: [...categoryIds] },
      },
    },
  };
  if (author !== null) {
    where.author = { username: author };
  }

  return await prisma.recipe.findMany({
    where,
    select: {
      name: true,
      slug: true,
      author: { select: { username: true } },
      cookingHistory:
        activeUser === null ? undefined : { where: { cookId: activeUser.id } },
    },
    orderBy: { name: "asc" },
  });
}

export const recipesInCategory = defineAction({ input, handler });
