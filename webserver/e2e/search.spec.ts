import { expect } from '@playwright/test';
import type { Recipe } from '@prisma/client';
import { test as baseTest } from './fixtures.js';

type Fixtures = {
  someSearchableRecipes: { fruitDessert: Recipe, cakeDessert: Recipe, sandwich: Recipe };
};
const test = baseTest.extend<Fixtures>({
  someSearchableRecipes: async ({ testCategory, testUser, testRecipe }, use) => {
    const dessert = await testCategory.create("Dessert");
    const supper = await testCategory.create("Supper");
    const lunch = await testCategory.create("Lunch");
    const fruit = await testCategory.create("Fruit");
    const cake = await testCategory.create("Cake");
    const user = await testUser.create({ username: 'testuser', name: "User Name" });
    const [fruitDessert, cakeDessert, sandwich] = await Promise.all([testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Fruit Dessert",
      slug: "fruit-dessert",
      ingredients: {
        create: [
          { name: "sugar" },
          { name: "apples" },
          { name: "pears" },
        ]
      },
      categories: { connect: [{ id: dessert.id }, { id: fruit.id }] },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Cake Dessert",
      slug: "cake-dessert",
      ingredients: {
        create: [
          { name: "flour" },
          { name: "sugar" },
          { name: "eggs" },
          { name: "butter" },
          { name: "cocoa" },
        ]
      },
      categories: { connect:[ { id: dessert.id }, {id: cake.id}] },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Sandwich",
      slug: "sandwich",
      ingredients: {
        create: [
          { name: "bread" },
          { name: "pickles" },
        ]
      },
      categories: { connect: { id: lunch.id } },
    })]);
    await use({ fruitDessert, cakeDessert, sandwich });
  }
});

test.only('Category Search', async ({ page, someSearchableRecipes }) => {
  const { sandwich, fruitDessert } = someSearchableRecipes;
  await page.goto('/search');

  function categorySelect(index: number) {
    return page.getByLabel('Any of these categories').nth(index);
  }

  await categorySelect(0).click();
  await categorySelect(0).getByRole('option', { name: 'dessert' }).click();
  await page.getByRole('button', {name: "Submit"}).click();
await expect()

  await expect.soft(page.locator('#recipes').getByRole("listitem")).toHaveText([
    sandwich.name,
    recipe1.name,
  ]);
});

test('Ingredient Filters', async ({ page, someSearchableRecipes }) => {
  const { recipe1 } = someSearchableRecipes;

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

test('Category Filters', async ({ page, someSearchableRecipes }) => {
  const { cakeDessert } = someSearchableRecipes;

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
    .filter({ hasText: /Supper/i }).getByRole("listitem")).toHaveText([cakeDessert.name]);
});
