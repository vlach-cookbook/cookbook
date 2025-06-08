import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import type { Prisma } from "@prisma/client";
import { defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";

export type RecipeInCategoryResponse = {
  name: string;
  slug: string;
  author: {
    username: string;
  };
  lastCooked: { year: number; month: number; day: number } | undefined;
};

const input = z.object({
  categoryIds: z.array(z.number().int()),
  author: z.string().optional(),
});
type Input = z.infer<typeof input>;

async function handler(
  { categoryIds, author }: Input,
  { cookies }: ActionAPIContext
): Promise<RecipeInCategoryResponse[]> {
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

  return (
    await prisma.recipe.findMany({
      where,
      select: {
        name: true,
        slug: true,
        author: { select: { username: true } },
        cookingHistory:
          activeUser === null
            ? undefined
            : {
                where: { cookId: activeUser.id },
                // Return just the latest cooking time.
                orderBy: [
                  {
                    cookedAtYear: "desc",
                  },
                  {
                    cookedAtMonth: "desc",
                  },
                  {
                    cookedAtDay: { sort: "desc", nulls: "last" },
                  },
                ],
                take: 1,
              },
      },
      orderBy: { name: "asc" },
    })
  ).map(({ name, slug, author, cookingHistory }) => ({
    name,
    slug,
    author,
    lastCooked: cookingHistory?.[0] && {
      year: cookingHistory[0].cookedAtYear,
      month: cookingHistory[0].cookedAtMonth,
      day: cookingHistory[0].cookedAtDay ?? 1,
    },
  }));
}

export const recipesInCategory = defineAction({ input, handler });
