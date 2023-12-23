import { prisma } from '@lib/prisma.js';
import { expect } from '@playwright/test';
import { test } from './fixtures.js';

test('When not logged in, redirects to /login', async ({ page }) => {
  await page.goto('/importMany');
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.getByRole('paragraph')).toContainText("Please login to import recipes.");
});

test('import page imports a json recipe', async ({ page, testLogin }) => {
  await page.goto('/importMany');

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

  await page.goto(`/r/${testLogin.username}/apple-crisp`);

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
  ).toHaveText([/dessert/i, /fruits/i]);

  await prisma.recipe.delete({
    where: {
      authorId_name: {
        authorId: testLogin.userId, name: "Apple Crisp"
      }
    }
  });
});
