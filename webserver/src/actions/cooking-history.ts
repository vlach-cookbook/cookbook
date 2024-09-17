import { Temporal } from "@js-temporal/polyfill";
import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import { Prisma } from "@prisma/client";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

const add = defineAction({
  accept: "form",
  input: z.object({
    author: z.string(),
    slug: z.string(),
    date: z.string().transform((s) => Temporal.PlainDate.from(s)),
  }),
  async handler({ author, slug, date }, { cookies }) {
    const cook = await getLogin(cookies);
    if (!cook) {
      throw new ActionError({
        code: "UNAUTHORIZED",
        message: "Must be logged in to add cooking history.",
      });
    }
    const recipe = await prisma.recipe.findFirst({
      where: { author: { username: author }, slug },
      select: { id: true },
    });
    if (!recipe) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: `No recipe found for ${author}/${slug}`,
      });
    }
    try {
      await prisma.cookingHistory.create({
        data: {
          recipe: { connect: { id: recipe.id } },
          cook: { connect: { id: cook.id } },
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
        return;
      } else {
        throw e;
      }
    }
  },
});

export default { add };
