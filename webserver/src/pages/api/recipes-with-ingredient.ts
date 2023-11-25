import { prisma } from "@lib/prisma";
import type { Prisma } from "@prisma/client";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const names = new Set<string>();
  for (const nameList of params.getAll('name')) {
    for (const name of nameList.split(',')) {
      names.add(name);
    }
  }
  const username = params.get('user');

  const where: Prisma.RecipeWhereInput = {
    ingredients: {
      some: {
        name: { in: [...names] }
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
