import { prisma } from '@lib/prisma.js';
import { expect } from '@playwright/test';
import { test } from './fixtures.js';

test('When not logged in, redirects to /login', async ({ page, testUser, testRecipe }) => {
  const user = await testUser.create({ username: "testuser", name: "testuser@email" });
  const recipe = await testRecipe.create({
    name: "A Recipe",
    slug: "a-recipe",
    author: { connect: { id: user.id } }
  });
  await page.goto(`/edit/${user.username}/${recipe.slug}`);
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.getByRole('paragraph')).toContainText("Please login to edit the A Recipe recipe.");
});

test.describe("Logged in", () => {
  let recipeId: number | undefined;

  test.beforeEach(async ({ page, testLogin }) => {
    const { userId, username } = testLogin;
    await page.goto('/importMany');

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
          authorId: userId, name: recipeName
        }
      }
    });
    recipeId = recipe.id;

    await page.goto(`/edit/${username}/${recipe.slug}`);
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

  test('Arrows navigate ingredients', async ({ page }) => {
    for (const field of ["amount", "unit", "name", "preparation"]) {
      await page.locator(`input[name="ingredient.1.${field}"]`).press('ArrowUp');
      await expect(page.locator(`input[name="ingredient.0.${field}"]`)).toBeFocused();
      await page.locator(`input[name="ingredient.0.${field}"]`).press('ArrowDown');
      await expect(page.locator(`input[name="ingredient.1.${field}"]`)).toBeFocused();
    }
  });

  test('Can drag ingredients', async ({ page }) => {
    // Make a third ingredient.
    await page.locator('input[name="ingredient.1.name"]').press('Enter');
    await page.locator('input[name="ingredient.2.name"]').fill("Spices");
    // Drag them into the opposite order, using one forward drag and one backward drag.
    const ingredients = page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Ingredients" }) })
      .getByRole("listitem");
    await ingredients.nth(0).dragTo(ingredients.nth(2), { sourcePosition: { x: 0, y: 0 } });
    await ingredients.nth(1).hover({ position: { x:0, y:0 } });
    await page.mouse.down();
    await ingredients.nth(0).hover();
    await ingredients.nth(0).hover();  // Give the drag some more time to land.
    await page.mouse.up();
    await expect.soft(ingredients.nth(0).getByPlaceholder("Ingredient")).toHaveValue("Spices");
    await expect.soft(ingredients.nth(1).getByPlaceholder("Ingredient")).toHaveValue("sucre");
    await expect.soft(ingredients.nth(2).getByPlaceholder("Ingredient")).toHaveValue("pomme");

    // Make sure the form field names are also right.
    await expect.soft(page.locator('input[name="ingredient.0.name"]')).toHaveValue("Spices");
    await expect.soft(page.locator('input[name="ingredient.1.name"]')).toHaveValue("sucre");
    await expect.soft(page.locator('input[name="ingredient.2.name"]')).toHaveValue("pomme");
  });

  test('Can insert ingredients', async ({ page }) => {
    // Insert an ingredient between the first and second.
    await page.locator('input[name="ingredient.0.name"]').press('Enter');
    await page.locator('input[name="ingredient.1.name"]').fill("Spices");

    await page.getByRole("button", { name: "Save" }).click();

    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { id: recipeId! },
      include: {
        ingredients: { orderBy: { order: "asc" } }
      }
    });
    expect(recipe).toMatchObject({
      name: "Test Recipe for Editing",
      slug: "test-recipe-for-editing",
      ingredients: [{
        amount: "3-4",
        name: "pomme",
      }, {
        name: "Spices",
      }, {
        amount: "1/2",
        name: "sucre",
        unit: "tasse",
        preparation: null,
      }],
      steps: ["Step 1", "Step 2", "Last step."],
    });
  });

  test('Can swap ingredients', async ({ page }) => {
    // Drag them into the opposite order, using one forward drag and one backward drag.
    const ingredients = page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Ingredients" }) })
      .getByRole("listitem");
    await ingredients.nth(1).dragTo(ingredients.nth(0), { sourcePosition: { x: 0, y: 0 } });

    await page.getByRole("button", { name: "Save" }).click();

    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { id: recipeId! },
      include: {
        ingredients: { orderBy: { order: "asc" } }
      }
    });
    expect(recipe).toMatchObject({
      name: "Test Recipe for Editing",
      slug: "test-recipe-for-editing",
      ingredients: [{
        amount: "1/2",
        name: "sucre",
        unit: "tasse",
        preparation: null,
      }, {
        amount: "3-4",
        name: "pomme",
      }],
      steps: ["Step 1", "Step 2", "Last step."],
    });
  });

  test('Split instructions with shift+enter', async ({ page }) => {
    const step0 = page.locator('textarea[name="step.0"]');
    await step0.selectText();
    // Put the cursor before the first character.
    await step0.press('ArrowLeft');
    // Put the cursor after the first character.
    await step0.press('ArrowRight');
    // Split the step.
    await step0.press('Shift+Enter');
    const step1 = page.locator('textarea[name="step.1"]');
    await expect(step1).toBeFocused();
    // Insert a letter and a newline at the beginning of the new step.
    await step1.press('Enter');

    await expect(page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Instructions" }) })
      .getByRole("textbox")
    ).toHaveText(["S", "\ntep 1", "Step 2", "Last step."]);
  });

  test('Join instructions with del and backspace', async ({ page }) => {
    const step2 = page.locator('textarea[name="step.2"]');
    await step2.selectText();
    // Put the cursor before the first character.
    await step2.press('ArrowLeft');
    // Join to the previous step.
    await step2.press('Backspace');

    // Check that the cursor is at the end of "Step 2".
    expect(await page.locator('textarea[name="step.1"]')
      .evaluate(node => node instanceof HTMLTextAreaElement
        ? [node.selectionStart, node.selectionEnd] : undefined)
    ).toEqual([6, 6]);

    const step0 = page.locator('textarea[name="step.0"]');
    // Now delete from the end of step 0.
    await step0.selectText();
    await step0.press('ArrowRight');
    await step0.press('Delete');

    // Check that the cursor is at the end of "Step 1".
    expect(await step0
      .evaluate(node => node instanceof HTMLTextAreaElement
        ? [node.selectionStart, node.selectionEnd] : undefined)
    ).toEqual([6, 6]);


    await expect(page.getByRole("group")
      .filter({ has: page.getByRole("heading", { name: "Instructions" }) })
      .getByRole("textbox")
    ).toHaveText(["Step 1Step 2Last step."]);
  });
});

test("Single-step recipe doesn't have a list, but adding a step creates the list", async ({ testLogin, testRecipe, page }) => {
  const { username } = testLogin;
  await testRecipe.create({
    author: { connect: { username } },
    name: "Test Recipe",
    slug: "test-recipe",
    ingredients: {
      create: [{
        order: 0,
        name: "Pears",
      }]
    },
    steps: ["Only step."],
  });
  await page.goto(`/edit/${username}/test-recipe`);
  const instructionsSection = page.getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Instructions" }) });
  await expect(instructionsSection.getByRole("listitem")).toHaveCount(0);

  await page.locator('textarea[name="step.0"]').press('Shift+Enter');
  await expect(instructionsSection.getByRole("listitem")).toHaveCount(2);
});
