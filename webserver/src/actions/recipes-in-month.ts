import { Temporal } from "@js-temporal/polyfill";
import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import {
  ActionError,
  defineAction,
  type ActionAPIContext,
} from "astro:actions";
import { z } from "astro:schema";

export type RecipesInMonthResponse = {
  name: string;
  slug: string;
  author: {
    username: string;
  };
}[];

async function handler(
  months: Temporal.PlainYearMonth[],
  { cookies }: ActionAPIContext
): Promise<RecipesInMonthResponse> {
  const user = await getLogin(cookies);
  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Can't examine a cooking history without being logged in.",
    });
  }

  return await prisma.recipe.findMany({
    where: {
      cookingHistory: {
        some: {
          OR: months.map((month) => ({
            cookId: user.id,
            cookedAtYear: month.year,
            cookedAtMonth: month.month,
          })),
        },
      },
    },
    select: {
      name: true,
      slug: true,
      author: { select: { username: true } },
    },
    orderBy: { name: "asc" },
  });
}

export default defineAction({
  input: z.array(z.string().transform((s) => Temporal.PlainYearMonth.from(s))),
  handler,
});
