import { Temporal } from "@js-temporal/polyfill";
import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import { Prisma } from "@prisma/client";
import type { APIRoute, AstroCookies } from "astro";

function tryParsePlainDate(str: string): Temporal.PlainDate | null {
  try {
    return Temporal.PlainDate.from(str);
  } catch {
    return null;
  }
}

async function validateInput(
  params: Record<string, string | undefined>,
  cookies: AstroCookies
): Promise<
  | {
      response: null;
      recipe: string;
      recipeId: number;
      cook: string;
      cookId: string;
      date: Temporal.PlainDate;
    }
  | { response: Response }
> {
  const user = await getLogin(cookies);
  const { username, slug, cook, date: dateStr } = params;

  if (!username || !slug || !cook || !dateStr) {
    return { response: new Response(`Invalid path`, { status: 404 }) };
  }

  if (user?.username !== cook) {
    return {
      response: new Response(`Can't add cooking history for ${cook}`, {
        status: 403,
      }),
    };
  }

  const date = tryParsePlainDate(dateStr);
  if (!date) {
    return {
      response: new Response(`Can't parse date from "${dateStr}"`, {
        status: 404,
      }),
    };
  }

  const recipe = await prisma.recipe.findFirst({
    where: { author: { username }, slug },
    select: { id: true },
  });
  if (!recipe) {
    return {
      response: new Response(`No recipe found for ${username}/${slug}`, {
        status: 404,
      }),
    };
  }

  return {
    response: null,
    recipe: `${username}/${slug}`,
    recipeId: recipe.id,
    cook,
    cookId: user.id,
    date,
  };
}

/**
 * @returns true if the entry was inserted or false if it already existed.
 */
async function doPut(
  recipeId: number,
  cookId: string,
  date: Temporal.PlainDate
): Promise<boolean> {
  try {
    await prisma.cookingHistory.create({
      data: {
        recipe: { connect: { id: recipeId } },
        cook: { connect: { id: cookId } },
        cookedAtYear: date.year,
        cookedAtMonth: date.month,
        cookedAtDay: date.day,
      },
      select: null,
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      // "Unique constraint failed".
      e.code === "P2002"
    ) {
      return false;
    } else {
      throw e;
    }
  }
  return true;
}

export const PUT: APIRoute = async ({ params, cookies }) => {
  const validationResult = await validateInput(params, cookies);
  if (validationResult.response) {
    return validationResult.response;
  }
  const { recipe, recipeId, cook, cookId, date } = validationResult;

  if (await doPut(recipeId, cookId, date)) {
    return new Response(`Marked that ${cook} made ${recipe} on ${date}.`, {
      status: 200,
    });
  }
  return new Response(
    `${cook} was already recorded as making ${recipe} on ${date}.`,
    { status: 200 }
  );
};

/**
 * @returns true if the entry was deleted or false if it wasn't present.
 */
async function doDelete(
  recipeId: number,
  cookId: string,
  date: Temporal.PlainDate
): Promise<boolean> {
  const { count } = await prisma.cookingHistory.deleteMany({
    where: {
      recipeId,
      cookId,
      cookedAtYear: date.year,
      cookedAtMonth: date.month,
      cookedAtDay: date.day,
    },
  });
  return count > 0;
}

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const validationResult = await validateInput(params, cookies);
  if (validationResult.response) {
    return validationResult.response;
  }
  const { recipe, recipeId, cook, cookId, date } = validationResult;

  return new Response(
    (await doDelete(recipeId, cookId, date))
      ? `Removed record that ${cook} made ${recipe} on ${date}.`
      : "Didn't remove non-existent cooking history.",
    {
      status: 200,
    }
  );
};

function parseUrl(url: any): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Supports a plain HTML form on the recipe page, for non-Javascript clients.
 *
 * Expects a `put` or `delete` parameter to say what to do with the history entry, and a `from`
 * parameter to say where to redirect back to.
 */
export const POST: APIRoute = async ({
  cookies,
  params,
  redirect,
  request,
}) => {
  const formData = await request.formData();
  const put = !!formData.get("put");
  const del = !!formData.get("delete");
  const from = parseUrl(formData.get("from"));
  if (!from) {
    return new Response("Missing 'from' form parameter.", { status: 400 });
  }

  if (put === del) {
    return new Response("Must pass exactly one of 'put' or 'del'.", {
      status: 400,
    });
  }

  const validationResult = await validateInput(params, cookies);
  if (validationResult.response) {
    from.searchParams.set("message", await validationResult.response.text());
    return redirect(from.href, 303);
  }
  const { recipeId, cookId, date } = validationResult;

  if (put) {
    await doPut(recipeId, cookId, date);
  } else if (del) {
    await doDelete(recipeId, cookId, date);
  }

  return redirect(from.href, 303);
};
