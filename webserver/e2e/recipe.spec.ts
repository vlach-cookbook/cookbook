import { expect } from '@playwright/test';
import { test } from './fixtures.js';
import { getSectionByHeading } from './util.js';

test('Renders a recipe', async ({ page, testUser, testRecipe }) => {
  const user = await testUser.create({ username: 'testuser', name: "User Name" });
  await testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Test Recipe",
    slug: "test-recipe",
    servings: 3,
    ingredients: {
      create: [
        { amount: "1", unit: "cup", name: "flour", preparation: "sifted" },
        { name: "sugar" },
        { amount: "3", name: "eggs" },
        { name: "butter", preparation: "melted" },
      ]
    },
    steps: ["1. Mix.\n2. Bake.\n3. Eat.\n\nNew Paragraph"],
  })
  await page.goto('/r/testuser/test-recipe');

  await expect.soft(page).toHaveTitle("Test Recipe");
  await expect.soft(getSectionByHeading(page, 'Ingredients').getByRole("listitem")).toHaveText([
    "1 cup flour, sifted",
    "sugar",
    "3 eggs",
    "butter, melted"
  ]);
  const instructions = getSectionByHeading(page, 'Instructions');
  await expect.soft(instructions.getByRole("listitem")).toHaveText([
    "Mix.",
    "Bake.",
    "Eat.",
  ]);
  await expect.soft(instructions.getByRole("paragraph")).toHaveText("New Paragraph");
});

test('Multiple steps are rendered as a list', async ({ page, testUser, testRecipe }) => {
  const user = await testUser.create({ username: 'testuser', name: "User Name" });
  await testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Test Recipe",
    slug: "test-recipe",
    ingredients: { create: { name: "sugar" } },
    steps: ["Mix.", "Bake."],
  });
  await page.goto('/r/testuser/test-recipe');

  await expect.soft(getSectionByHeading(page, 'Ingredients').getByRole("listitem")).toHaveText([
    "sugar",
  ]);
  await expect.soft(getSectionByHeading(page, 'Instructions').getByRole("listitem")).toHaveText([
    "Mix.",
    "Bake.",
  ]);
});

test("Shows author's name", async ({ page, testUser, testRecipe, testLogin }) => {
  const { username } = testLogin;
  const author = await testUser.create({ username: 'recipeauthor', name: "User Name" });
  expect(username).not.toEqual(author.username);
  await testRecipe.create({
    author: { connect: { id: author.id } },
    name: "Test Recipe",
    slug: "test-recipe",
    ingredients: { create: [{ name: "sugar" },] },
    steps: ["Bake"],
  })
  await page.goto('/r/recipeauthor/test-recipe');

  await expect.soft(page.getByRole("link", { name: "✏️" })).toHaveCount(0);
  await page.getByRole("link", { name: "User Name" }).click();
  await expect(page).toHaveURL(/.*\/r\/recipeauthor$/);
  await expect(page).toHaveTitle("User Name's Recipes");
});

test("Shows name edit link when author is logged in", async ({ page, testLogin, testRecipe }) => {
  const { username } = testLogin;
  await testRecipe.create({
    author: { connect: { username } },
    name: "Test Recipe",
    slug: "test-recipe",
    ingredients: { create: [{ name: "sugar" },] },
    steps: ["Bake"],
  })
  await page.goto(`/r/${username}/test-recipe`);

  await expect.soft(page.getByRole("link", { name: "✏️" })).toHaveAttribute("title", "Edit your name");
  await page.getByRole("link", { name: "✏️" }).click();
  await expect(page).toHaveURL(/.*\/account$/);
});