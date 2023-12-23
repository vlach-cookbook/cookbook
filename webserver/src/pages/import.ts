import { getLogin } from "@lib/login-cookie";
import { parseRecipesFromUrl } from "@lib/parse-recipe";
import { prisma } from "@lib/prisma";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ url, request, cookies, redirect }) => {
  const user = await getLogin(cookies);

  if (!user) {
    const target = new URL("${import.meta.env.BASE_URL}login", url);
    target.searchParams.set("from", request.url);
    target.searchParams.set("message", "Please login to import recipes.");
    return redirect(target.href, 303);
  }

  const formData = await request.formData();
  const sourceUrl = formData.get('source');
  if (typeof sourceUrl !== 'string') {
    const target = new URL(`${import.meta.env.BASE_URL}new`, url);
    return redirect(target.href, 303);
  }

  const recipes = await parseRecipesFromUrl(sourceUrl);
  if (recipes.length === 0) {
    const target = new URL(`${import.meta.env.BASE_URL}new`, url);
    target.searchParams.set("message", `Found no recipes in ${sourceUrl}.`);
    return redirect(target.href, 303);
  }

  const drafts = await prisma.$transaction(recipes.map(recipe =>
    prisma.draftRecipe.create({
      data: {
        User: { connect: { id: user.id } },
        data: recipe,
      },
      select: { id: true },
    }),
  ));

  const target = new URL(`${import.meta.env.BASE_URL}new`, url);
  target.searchParams.set("draft", drafts.map(draft => draft.id).join(","));
  return redirect(target.href, 303);
}
