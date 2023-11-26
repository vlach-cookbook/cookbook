import { expect } from '@playwright/test';
import type { Recipe } from '@prisma/client';
import { test as baseTest } from './fixtures.js';

type Fixtures = {
  someFilterableRecipes: { recipe1: Recipe, recipe2: Recipe, sandwich: Recipe };
};
const test = baseTest.extend<Fixtures>({
  someFilterableRecipes: async ({ testCategory, testUser, testRecipe }, use) => {
    const dessert = await testCategory.create("Dessert");
    const supper = await testCategory.create("Supper");
    const lunch = await testCategory.create("Lunch");
    const user = await testUser.create({ username: 'testuser', name: "User Name" });
    const [recipe1, recipe2, sandwich] = await Promise.all([testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Test Recipe 1",
      slug: "test-recipe",
      ingredients: {
        create: [
          { order: 0, name: "flour" },
          { order: 1, name: "sugar" },
          { order: 2, name: "eggs" },
          { order: 3, name: "butter" },
        ]
      },
      categories: { connect: { id: dessert.id } },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Recipe 2",
      slug: "test-recipe-2",
      ingredients: {
        create: [
          { order: 0, name: "bread" },
        ]
      },
      categories: { connect: { id: supper.id } },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Sandwich",
      slug: "sandwich",
      ingredients: {
        create: [
          { order: 0, name: "bread" },
          { order: 1, name: "pickles" },
        ]
      },
      categories: { connect: { id: lunch.id } },
    })]);
    await use({ recipe1, recipe2, sandwich });
  }
});

test('Recipe Filters', async ({ page, someFilterableRecipes }) => {
  const { sandwich, recipe1 } = someFilterableRecipes;
  await page.goto('/r');

  await expect(page.getByLabel(/Filter/)).toHaveValue("");

  await page.getByLabel(/Filter/).fill("s");
  await expect(page).toHaveURL("/r?filter=s");

  // Make sure Enter doesn't erase the form contents.
  await page.getByLabel(/Filter/).press("Enter");
  await expect(page.getByLabel(/Filter/)).toHaveValue("s");

  await expect.soft(page.locator('#recipes').getByRole("listitem")).toHaveText([
    sandwich.name,
    recipe1.name,
  ]);
});

test('Ingredient Filters', async ({ page, someFilterableRecipes }) => {
  const { recipe1 } = someFilterableRecipes;

  await page.goto('/ingredients');

  await expect(page.getByLabel(/Filter/)).toHaveValue("");

  await page.getByLabel(/Filter/).fill("s");
  await expect(page).toHaveURL("/ingredients?filter=s");

  await expect.soft(page.locator('#ingredients').getByRole("listitem").locator("summary")).toHaveText([
    /^sugar$/i,
    /^eggs$/i,
    /^pickles$/i,
  ]);

  await page.locator('#ingredients').getByRole("listitem").filter({ hasText: "sugar" }).click();
  await expect.soft(page.locator('#ingredients').getByRole("listitem")
    .filter({ hasText: /sugar/i }).getByRole("listitem")).toHaveText([recipe1.name]);
  await expect.soft(page.locator('#ingredients').getByRole("listitem")
    .filter({ hasText: /eggs/i }).getByRole("listitem")).not.toBeVisible();
});

test('Category Filters', async ({ page, someFilterableRecipes }) => {
  const { recipe2 } = someFilterableRecipes;

  await page.goto('/categories');

  await expect(page.getByLabel(/Filter/)).toHaveValue("");

  await page.getByLabel(/Filter/).fill("s");
  await expect(page).toHaveURL("/categories?filter=s");

  await expect.soft(page.locator('#categories').getByRole("listitem").locator("summary")).toHaveText([
    /^Supper$/i,
    /^Dessert$/i,
  ]);

  await page.locator('#categories').getByRole("listitem")
    .filter({ hasText: /Supper/i }).click();
  await expect.soft(page.locator('#categories').getByRole("listitem")
    .filter({ hasText: /Supper/i }).getByRole("listitem")).toHaveText([recipe2.name]);
});

test('Filter by user', async ({ page, testUser, testRecipe }) => {
  const user1 = await testUser.create({ username: 'testuser1', name: "User Name" });
  const user2 = await testUser.create({ username: 'testuser2', name: "Second User" });
  await Promise.all([testRecipe.create({
    author: { connect: { id: user1.id } },
    name: "Test Recipe 1",
    slug: "test-recipe",
  }), testRecipe.create({
    author: { connect: { id: user2.id } },
    name: "Recipe 2",
    slug: "test-recipe-2",
  })]);
  await page.goto('/r/testuser2');

  await expect(page.getByLabel(/Filter/)).toHaveText("");
  await expect.soft(page.getByRole("heading", { name: "Ingredients" })).not.toBeVisible();
  await expect.soft(page.getByRole("heading", { name: "Categories" })).not.toBeVisible();

  await expect.soft(page.getByRole("listitem")).toHaveText(["Recipe 2"]);
});

test('Back and Forward navigate through filters', async ({ page, testUser, testRecipe }) => {
  const user = await testUser.create({ username: 'testuser', name: "User Name" });
  await Promise.all([testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Ice Cream",
    slug: "ice-cream",
  }), testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Sandwich",
    slug: "sandwich",
  })]);
  await page.goto('/');

  await expect(page.getByLabel(/Filter/)).toHaveText("");
  await page.getByLabel(/Filter/).fill("ice");
  await page.getByLabel(/Filter/).fill("sand");
  await page.getByLabel(/Filter/).press("Enter");
  await page.getByLabel(/Filter/).fill("cr");
  await page.getByLabel(/Filter/).fill("");
  await expect(page, "An empty filter should remove the query parameter.").toHaveURL(/\/$/);
  await expect.soft(page.getByRole("listitem")).toHaveText([
    "Ice Cream",
    "Sandwich",
  ]);

  await page.goBack();
  await expect(page).toHaveURL(/\?filter=sand$/);
  await expect.soft(page.getByLabel(/Filter/)).toHaveValue("sand");
  await expect.soft(page.getByRole("listitem")).toHaveText(["Sandwich"]);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.soft(page.getByRole("listitem")).toHaveText([
    "Ice Cream",
    "Sandwich",
  ]);

  await page.goForward();
  await expect(page).toHaveURL(/\?filter=sand$/);
  await expect.soft(page.getByLabel(/Filter/)).toHaveValue("sand");
  await expect.soft(page.getByRole("listitem")).toHaveText(["Sandwich"]);

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect.soft(page.getByLabel(/Filter/)).toHaveValue("");
  await expect.soft(page.getByRole("listitem")).toHaveText([
    "Ice Cream",
    "Sandwich",
  ]);
});

test('Loading with a filter initializes single ingredients to open',
  async ({ page, someFilterableRecipes }) => {
    const { recipe1 } = someFilterableRecipes;

    await page.goto('/ingredients?filter=butter');

    await expect(page.locator('#ingredients')
      .getByRole("listitem").filter({ hasText: /butter/i })
      .getByRole("listitem").filter({ hasText: recipe1.name })).toBeVisible();
  }
);

test('Loading with a filter initializes single categories to open',
  async ({ page, testUser, testCategory, testRecipe }) => {
    const dessert = await testCategory.create("Dessert");
    const supper = await testCategory.create("Supper");
    const lunch = await testCategory.create("Lunch");
    const user = await testUser.create({ username: 'testuser', name: "User Name" });
    await Promise.all([testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Test Recipe 1",
      slug: "test-recipe",
      categories: { connect: { id: dessert.id } },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Recipe 2",
      slug: "test-recipe-2",
      categories: { connect: { id: supper.id } },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Sandwich",
      slug: "sandwich",
      categories: { connect: { id: lunch.id } },
    })]);
    await page.goto('/categories?filter=supper');

    await expect(page.locator('#categories')
      .getByRole("listitem").filter({ hasText: /supper/i })
      .getByRole("listitem").filter({ hasText: "Recipe 2" })).toBeVisible();

  }
);
