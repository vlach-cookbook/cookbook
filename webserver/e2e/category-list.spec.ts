import { expect } from "@playwright/test";
import type { Recipe } from "@prisma/client";
import { test as baseTest } from "./fixtures.js";

type Fixtures = {
  someFilterableRecipes: { recipe1: Recipe; recipe2: Recipe; sandwich: Recipe };
};
const test = baseTest.extend<Fixtures>({
  someFilterableRecipes: async (
    { testCategory, testUser, testRecipe },
    use
  ) => {
    const dessert = await testCategory.create("dessert");
    const supper = await testCategory.create("supper");
    const lunch = await testCategory.create("lunch");
    const user = await testUser.create({
      username: "testuser",
      name: "User Name",
    });
    const cookuser = await testUser.create({
      username: "cook",
      name: "Cook User",
    });
    const [recipe1, recipe2, sandwich] = await Promise.all([
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Test Recipe 1",
        slug: "test-recipe",
        ingredients: {
          create: [
            { order: 0, name: "flour" },
            { order: 1, name: "sugar" },
            { order: 2, name: "eggs" },
            { order: 3, name: "butter" },
          ],
        },
        categories: { connect: { id: dessert.id } },
      }),
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Recipe 2",
        slug: "test-recipe-2",
        ingredients: {
          create: [{ order: 0, name: "bread" }],
        },
        categories: { connect: { id: supper.id } },
        cookingHistory: {
          create: [
            {
              cookedAtYear: 2023,
              cookedAtMonth: 4,
              cook: { connect: { id: user.id } },
            },
            {
              cookedAtYear: 2023,
              cookedAtMonth: 10,
              cook: { connect: { id: cookuser.id } },
            },
          ],
        },
      }),
      testRecipe.create({
        author: { connect: { id: user.id } },
        name: "Sandwich",
        slug: "sandwich",
        ingredients: {
          create: [
            { order: 0, name: "bread" },
            { order: 1, name: "pickles" },
          ],
        },
        categories: { connect: { id: lunch.id } },
      }),
    ]);
    await use({ recipe1, recipe2, sandwich });
  },
});

test("Category Filters", async ({ page, someFilterableRecipes }) => {
  const { recipe2 } = someFilterableRecipes;

  await page.goto("/categories");

  await expect(page.getByLabel(/Filter/)).toHaveValue("");

  await page.getByLabel(/Filter/).fill("s");
  await expect(page).toHaveURL("/categories?filter=s");

  await expect
    .soft(page.locator("#categories").getByRole("listitem").locator("summary"))
    .toHaveText([/^Supper$/i, /^Dessert$/i]);

  await page
    .locator("#categories")
    .getByRole("listitem")
    .filter({ hasText: /Supper/i })
    .click();
  await expect
    .soft(
      page
        .locator("#categories")
        .getByRole("listitem")
        .filter({ hasText: /Supper/i })
        .getByRole("listitem")
    )
    .toHaveText([recipe2.name]);
});

test("Categories sort by history when logged in", async ({
  page,
  someFilterableRecipes,
  testLogin,
  testRecipe,
}) => {
  const { recipe2: supperApril } = someFilterableRecipes;
  const { userId: _ } = testLogin;

  const [supperMay, supperNotCooked] = await Promise.all([
    testRecipe.create({
      author: { connect: { username: "testuser" } },
      name: "Cooked in May",
      slug: "cooked-in-may",
      ingredients: {
        create: [{ order: 0, name: "bread" }],
      },
      categories: { connect: { name: "supper" } },
      cookingHistory: {
        create: [
          {
            cookedAtYear: 2023,
            cookedAtMonth: 5,
            cook: { connect: { username: "testuser" } },
          },
        ],
      },
    }),
    testRecipe.create({
      author: { connect: { username: "testuser" } },
      name: "Not Cooked",
      slug: "not-cooked",
      ingredients: {
        create: [{ order: 0, name: "bread" }],
      },
      categories: { connect: { name: "supper" } },
    }),
  ]);

  await page.goto("/categories?filter=supper");

  await expect
    .soft(page.locator("#categories").getByRole("listitem").locator("summary"))
    .toHaveText([/^Supper$/i]);

  await expect
    .soft(
      page
        .locator("#categories")
        .getByRole("listitem")
        .filter({ hasText: /Supper/i })
        .getByRole("listitem")
    )
    .toHaveText([
      supperNotCooked.name,
      `${supperApril.name} last cooked Apr 2023`,
      `${supperMay.name} last cooked May 2023`,
    ]);
});
