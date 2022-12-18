import { expect, test } from '@playwright/test';
import { prisma } from '../src/lib/prisma.js';

let recipeId: number | undefined;

test.beforeEach(async ({ page }) => {
  await page.goto('/import');

  const recipeName = "Test Recipe for Editing";

  await page.getByLabel('JSON recipes').setInputFiles({
    name: 'recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{
      name: recipeName,
      recipeCategory: ["fruits", "dessert"],
      recipeIngredient: [{
        name: "pomme",
        quantity: "3-4"
      }, {
        name: "sucre",
        quantity: "1/2",
        unit: "tasse",
      }],
      recipeInstructions: [
        "Step 1",
        "Step 2",
        "Last step."
      ]
    }])),
  });

  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByRole('paragraph')).toHaveText("Success! 1 recipes imported.");

  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: {
      authorId_name: {
        authorId: process.env.TEST_USER_ID!, name: recipeName
      }
    }
  });
  recipeId = recipe.id;

  await page.goto(`/edit/${process.env.TEST_USERNAME}/${recipe.slug}`);
});

test.afterEach(async () => {
  if (recipeId !== undefined) {
    await prisma.recipe.delete({ where: { id: recipeId } })
    recipeId = undefined;
  }
});

test('basic editing modifies the recipe', async ({ page }) => {
  const nameField = page.getByLabel("Recipe name:");
  await expect(nameField).toHaveValue("Test Recipe for Editing");
  await nameField.fill("New Name for Test Recipe");

  const servingsField = page.getByLabel("Servings");
  await expect(servingsField).toHaveValue("");
  await servingsField.fill("4");

  const oneIngredient = page.getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Ingredients" }) })
    .getByRole("listitem").first();

  await expect(oneIngredient.getByPlaceholder("Amount")).toHaveValue("3-4");
  await oneIngredient.getByPlaceholder("Amount").fill("7");

  await expect(oneIngredient.getByPlaceholder("Unit")).toHaveValue("");
  await oneIngredient.getByPlaceholder("Unit").fill("oz");

  await expect(oneIngredient.getByPlaceholder("Ingredient")).toHaveValue("pomme");
  await oneIngredient.getByPlaceholder("Ingredient").fill("Pears");

  await expect(oneIngredient.getByPlaceholder("Preparation")).toHaveValue("");
  await oneIngredient.getByPlaceholder("Preparation").fill("sliced");


  const instructions = page.getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Instructions" }) })
    .getByRole("textbox");
  await expect(instructions).toHaveText(["Step 1", "Step 2", "Last step."]);
  await instructions.first().fill("First step.");

  const categories = page.getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Categories" }) })
    .getByRole("combobox");
  // Alphabetic:
  expect(await categories.evaluateAll(
    elems => elems.map(elem => elem instanceof HTMLInputElement ? elem.value : undefined))
  ).toEqual(["dessert", "fruits"]);
  await categories.first().fill("lunch");

  await page.getByRole("button", { name: "Save" }).click();

  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId! },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      categories: { orderBy: { name: "asc" } }
    }
  });
  expect(recipe).toMatchObject({
    name: "New Name for Test Recipe",
    slug: "test-recipe-for-editing",
    ingredients: [{
      amount: "7",
      unit: "oz",
      name: "Pears",
      preparation: "sliced",
    }, {
      amount: "1/2",
      name: "sucre",
      unit: "tasse",
      preparation: null,
    }],
    steps: ["First step.", "Step 2", "Last step."],
    categories: [
      { name: "fruits" },
      { name: "lunch" },
    ]
  });
});
