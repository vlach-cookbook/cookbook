import { prisma } from '@lib/prisma.js';
import { expect } from '@playwright/test';
import { test } from './fixtures.js';

test('When not logged in, redirects to /login', async ({ page }) => {
  await page.goto(`/new`);
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.getByRole('paragraph')).toContainText("Please login to add a new recipe.");
});

test.describe("Logged in", () => {
  let recipeId: number | undefined;

  test.afterEach(async () => {
    if (recipeId !== undefined) {
      await prisma.recipe.delete({ where: { id: recipeId } })
      recipeId = undefined;
    }
  });

  test('can create a new recipe', async ({ page, testLogin }) => {
    const {username} = testLogin;
    await page.goto(`/new`);
    const nameField = page.getByLabel("Recipe name:");
    await expect(nameField).toHaveValue("");
    await nameField.fill("Chocolate Chip Cookies");

    const servingsField = page.getByLabel("Servings");
    await expect(servingsField).toHaveValue("");
    await servingsField.fill("4");

    const oneIngredient = page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Ingredients" }) })
      .getByRole("listitem").first();

    await expect(oneIngredient.getByPlaceholder("Amount")).toHaveValue("");
    await oneIngredient.getByPlaceholder("Amount").fill("7");

    await expect(oneIngredient.getByPlaceholder("Unit")).toHaveValue("");
    await oneIngredient.getByPlaceholder("Unit").fill("oz");

    await expect(oneIngredient.getByPlaceholder("Ingredient")).toHaveValue("");
    await oneIngredient.getByPlaceholder("Ingredient").fill("Pears");

    await expect(oneIngredient.getByPlaceholder("Preparation")).toHaveValue("");
    await oneIngredient.getByPlaceholder("Preparation").fill("sliced");


    const instructions = page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Instructions" }) })
      .getByRole("textbox");
    await expect(instructions).toHaveText([""]);
    await instructions.first().fill("First step.");

    const categories = page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Categories" }) })
      .getByRole("combobox");
    // Alphabetic:
    expect(await categories.evaluateAll(
      elems => elems.map(elem => elem instanceof HTMLInputElement ? elem.value : undefined))
    ).toEqual([""]);
    await categories.first().fill("lunch");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", {level: 2})).toHaveText("Chocolate Chip Cookies");

    const recipe = await prisma.recipe.findMany({
      where: { author: {username}, slug: "chocolate-chip-cookies" },
      include: {
        ingredients: { orderBy: { order: "asc" } },
        categories: { orderBy: { name: "asc" } }
      }
    });
    expect(recipe.length).toEqual(1);
    recipeId = recipe[0]!.id;
    expect(recipe[0]).toMatchObject({
      name: "Chocolate Chip Cookies",
      slug: "chocolate-chip-cookies",
      ingredients: [{
        amount: "7",
        unit: "oz",
        name: "Pears",
        preparation: "sliced",
      }],
      steps: ["First step."],
      categories: [
        { name: "lunch" },
      ]
    });
  });
});

