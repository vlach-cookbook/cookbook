import { expect } from '@playwright/test';
import { test } from './fixtures.js';
import { getSectionByHeading } from './util.js';

test('Filters', async ({ page, testUser, testCategory, testRecipe }) => {
  const dessert = await testCategory.create("Dessert");
  const supper = await testCategory.create("Supper");
  const lunch = await testCategory.create("Lunch");
  const user = await testUser.create({ username: 'testuser', name: "User Name" });
  await Promise.all([testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Test Recipe 1",
    slug: "test-recipe",
    ingredients: {
      create: [
        { name: "flour" },
        { name: "sugar" },
        { name: "eggs" },
        { name: "butter" },
      ]
    },
    categories: { connect: { id: dessert.id } },
  }), testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Recipe 2",
    slug: "test-recipe-2",
    ingredients: {
      create: [
        { name: "bread" },
      ]
    },
    categories: { connect: { id: supper.id } },
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
  await page.goto('/');

  await expect(page.getByLabel(/Filter/)).toHaveValue("");
  await expect.soft(page.getByRole("heading", { name: "Ingredients" })).not.toBeVisible();
  await expect.soft(page.getByRole("heading", { name: "Categories" })).not.toBeVisible();

  await page.getByLabel(/Filter/).fill("s");
  await expect(page).toHaveURL("/?filter=s");

  // Make sure Enter doesn't erase the form contents.
  await page.getByLabel(/Filter/).press("Enter");
  await expect(page.getByLabel(/Filter/)).toHaveValue("s");

  await expect.soft(getSectionByHeading(page, 'Recipes').getByRole("listitem")).toHaveText([
    "Sandwich",
    "Test Recipe 1",
  ]);
  await expect.soft(getSectionByHeading(page, 'Ingredients').getByRole("listitem").locator("summary")).toHaveText([
    /^sugar$/i,
    /^eggs$/i,
    /^pickles$/i,
  ]);
  await expect.soft(getSectionByHeading(page, 'Categories').getByRole("listitem").locator("summary")).toHaveText([
    /^Supper$/i,
    /^Dessert$/i,
  ]);

  await getSectionByHeading(page, 'Ingredients').getByRole("listitem").filter({ hasText: "sugar" }).click();
  await expect.soft(getSectionByHeading(page, 'Ingredients').getByRole("listitem")
    .filter({ hasText: /sugar/i }).getByRole("listitem")).toHaveText(["Test Recipe 1"]);
  await expect.soft(getSectionByHeading(page, 'Ingredients').getByRole("listitem")
    .filter({ hasText: /eggs/i }).getByRole("listitem")).not.toBeVisible();

  await getSectionByHeading(page, 'Categories').getByRole("listitem")
    .filter({ hasText: /Supper/i }).click();
  await expect.soft(getSectionByHeading(page, 'Categories').getByRole("listitem")
    .filter({ hasText: /Supper/i }).getByRole("listitem")).toHaveText(["Recipe 2"]);
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
  async ({ page, testUser, testCategory, testRecipe }) => {
    const user = await testUser.create({ username: 'testuser', name: "User Name" });
    await Promise.all([testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Test Recipe 1",
      slug: "test-recipe",
      ingredients: {
        create: [
          { name: "flour" },
          { name: "sugar" },
          { name: "eggs" },
          { name: "butter" },
        ]
      },
    }), testRecipe.create({
      author: { connect: { id: user.id } },
      name: "Recipe 2",
      slug: "test-recipe-2",
      ingredients: {
        create: [
          { name: "bread" },
        ]
      },
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
    })]);
    await page.goto('/?filter=butter');

    await expect(getSectionByHeading(page, 'Ingredients')
      .getByRole("listitem").filter({ hasText: /butter/i })
      .getByRole("listitem").filter({ hasText: "Test Recipe 1" })).toBeVisible();
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
    await page.goto('/?filter=supper');

    await expect(getSectionByHeading(page, 'Categories')
      .getByRole("listitem").filter({ hasText: /supper/i })
      .getByRole("listitem").filter({ hasText: "Recipe 2" })).toBeVisible();

  }
);
