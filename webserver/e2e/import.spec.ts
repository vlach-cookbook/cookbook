import { expect, test } from '@playwright/test';

test('import page imports a json recipe', async ({ page }) => {
  await page.goto('/import');

  await expect(page).toHaveTitle("Import recipes");

  await page.getByLabel('JSON recipes').setInputFiles({
    name: 'recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{
      "dateCreated": "1996-05-31",
      "name": "APPLE CRISP",
      "recipeCategory": ["janv. 95", "dessert", "fruits"],
      "recipeIngredient":
        [
          {
            "name": "pomme",
            "quantity": "3-4"
          },
        ],
      "recipeInstructions":
        [
          "Couper les pommes en quartiers dans un pirex. Ne pas trop melanger les",
          "autres ingredients. Verser sur les pommes. Cuire a chaleur 3/4. Servir avec",
          "de la creme ou de la glace."
        ]
    },])),
  });

  await page.getByRole('button', { name: 'Import' }).click();

  await expect(page.getByRole('paragraph')).toHaveText("Success! 1 recipes imported.");

  await page.goto('/r/testuser/apple-crisp');

  await expect(page.getByRole("listitem")).toContainText(["3-4 pomme", "Couper les pommes", "dessert"]);
});
