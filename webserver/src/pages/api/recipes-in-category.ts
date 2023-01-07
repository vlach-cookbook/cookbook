import { prisma } from "@lib/prisma";
import type { Prisma } from "@prisma/client";
import type { APIRoute } from "astro";

export const get: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const ids = new Set<number>();
  for (const idList of params.getAll('id')) {
    for (const idStr of idList.split(',')) {
      const id = parseInt(idStr);
      if (!isNaN(id)) {
        ids.add(id);
      }
    }
  }
  const username = params.get('user');

  const where: Prisma.RecipeWhereInput = {
    categories: {
      some: {
        id: { in: [...ids] }
      }
    }
  };
  if (username !== null) {
    where.author = { username };
  }

  const recipes = await prisma.recipe.findMany({
    where,
    select: {
      name: true,
      slug: true,
      author: { select: { username: true } }
    },
    orderBy: { name: 'asc' }
  });

  return new Response(JSON.stringify(recipes), {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
