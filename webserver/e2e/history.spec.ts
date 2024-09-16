import { Temporal } from "@js-temporal/polyfill";
import { expect } from "@playwright/test";
import type { Recipe, RecipeIngredient, User } from "@prisma/client";
import { test as baseTest } from "./fixtures.js";

type RecipeWithDetails = Recipe & {
  author: User;
  ingredients: RecipeIngredient[];
};

type Fixtures = {
  someFilterableRecipes: {
    user: User;
    recipe1: RecipeWithDetails;
    recipe2: RecipeWithDetails;
    sandwich: RecipeWithDetails;
  };
};
const test = baseTest.extend<Fixtures>({
  someFilterableRecipes: async ({ testUser, testRecipe }, use) => {
    const user = await testUser.create({
      username: "testauthor",
      name: "Recipe Author",
    });
    const [recipe1, recipe2, sandwich] = await Promise.all([
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Test Recipe 1",
        slug: "test-recipe",
        cookingHistory: {
          create: [
            {
              cookedAtYear: 2023,
              cookedAtMonth: 4,
              cook: { connect: { id: user.id } },
            },
          ],
        },
      }),
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Recipe 2",
        slug: "test-recipe-2",
        cookingHistory: {
          create: [
            {
              cookedAtYear: 2023,
              cookedAtMonth: 5,
              cook: { connect: { id: user.id } },
            },
          ],
        },
      }),
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Sandwich",
        slug: "sandwich",
        cookingHistory: {
          create: [
            {
              cookedAtYear: 2023,
              cookedAtMonth: 6,
              cook: { connect: { id: user.id } },
            },
          ],
        },
      }),
    ]);
    await use({ user, recipe1, recipe2, sandwich });
  },
});

test("Omit other user's history", async ({
  page,
  context,
  testSession,
  someFilterableRecipes,
}) => {
  const { recipe1: _ } = someFilterableRecipes;
  await testSession.login({
    context,
    user: {
      username: "testcook",
      name: "Cook",
    },
  });

  await page.goto("/history");
  await expect(page).toHaveURL("/history");

  await expect
    .soft(page.locator("#history").getByRole("listitem").locator("summary"))
    .toHaveText([]);
});

test("Save history", async ({
  page,
  context,
  someFilterableRecipes,
  testSession,
}) => {
  const { user, recipe1 } = someFilterableRecipes;
  await testSession.login({
    context,
    user,
  });

  await page.goto(`/r/${recipe1.author.username}/${recipe1.slug}`);

  await expect(
    page.locator("#cooking-history").getByRole("listitem")
  ).toHaveText(["Apr 2023"]);

  await page.getByRole("button", { name: "🍲" }).click();

  const ym = Temporal.Now.plainDateISO().toPlainYearMonth();
  await expect(
    page.locator("#cooking-history").getByRole("listitem")
  ).toHaveText([
    ym.toLocaleString("en", {
      month: "short",
      year: "numeric",
      calendar: ym.calendarId,
    }),
    "Apr 2023",
  ]);
});
