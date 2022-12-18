import { expect, test } from '@playwright/test';
import { prisma } from '../src/lib/prisma.js';

test('import page imports a json recipe', async ({ page }) => {
  await page.goto('/import');

  await expect(page).toHaveTitle("Import recipes");

  await page.getByLabel('JSON recipes').setInputFiles({
    name: 'recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{
      "dateCreated": "1996-05-31",
      "name": "Apple Crisp",
      "recipeCategory": ["dessert", "fruits"],
      "recipeIngredient": [{
        "name": "pomme",
        "quantity": "3-4"
      }],
      "recipeInstructions": [
        "Step 1",
        "Step 2",
        "Last step."
      ]
    }])),
  });

  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByRole('paragraph')).toHaveText("Success! 1 recipes imported.");

  await page.goto(`/r/${process.env.TEST_USERNAME}/apple-crisp`);

  await expect(page.getByRole('heading', { name: "Apple Crisp" })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Ingredients" })
    .locator("xpath=ancestor::section[1]")
    .getByRole("listitem")
  ).toHaveText(["3-4 pomme"]);
  await expect(page.getByRole('heading', { name: "Instructions" })
    .locator("xpath=ancestor::section[1]")
    .getByRole("listitem")
  ).toHaveText(["Step 1", "Step 2", "Last step."]);
  await expect(page.getByRole('heading', { name: "Categories" })
    .locator("xpath=ancestor::section[1]")
    .getByRole("listitem")
  ).toHaveText(["dessert", "fruits"]);

  prisma.recipe.delete({
    where: {
      authorId_name: {
        authorId: process.env.TEST_USER_ID!, name: "Apple Crisp"
      }
    }
  });
});
