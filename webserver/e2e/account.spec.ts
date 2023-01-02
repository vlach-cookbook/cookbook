import { prisma } from '@lib/prisma.js';
import { usernameRegex } from '@lib/valid-username';
import { expect } from '@playwright/test';
import { test } from './fixtures.js';

test('Valid usernames', async () => {
  expect("").not.toMatch(usernameRegex);
  expect("-").toMatch(usernameRegex);
  expect("a1-23").toMatch(usernameRegex);
  expect("username").toMatch(usernameRegex);
  expect("uSeRnAmE").toMatch(usernameRegex);
  expect("用户名").toMatch(usernameRegex);
  expect("a b").not.toMatch(usernameRegex);
  expect("a/b").not.toMatch(usernameRegex);
  expect("a?b").not.toMatch(usernameRegex);
});

test('When not logged in, redirects to /login', async ({ page }) => {
  await page.goto('/account');
  expect(new URL(page.url()).pathname).toBe('/login');
  await expect(page.getByRole('paragraph')).toContainText("Please login to the account you wish to edit.");
});

test('Empty user needs to pick a unique username', async ({ page, testUser, testSession }) => {
  await testUser.create({
    name: "Existing User",
    username: "existinguser",
  });
  const sessionId = "Session for Test Empty User";
  const session = await testSession.create(sessionId, {
    user: {
      name: "test-email@gmail.com",
      username: "test-email",
      GoogleUser: {
        create: {
          gid: "Test Google SID",
          email: "test-email@gmail.com"
        }
      }
    }
  });
  const user = session.user;
  const testUserId = user.id;
  testSession.addLoginCookie(page.context(), sessionId);

  await page.goto('/account');
  expect(new URL(page.url()).pathname).toBe('/account');

  await expect.soft(page.getByText(/Your recipes will appear/))
    .toContainText("/r/test-email/recipe-name");

  await page.getByLabel("Display Name").fill("User's Display Name");
  const usernameField = page.getByLabel("Username");
  await usernameField.fill("existinguser");

  await expect.soft(page.getByText(/Your recipes will appear/))
    .toContainText("/r/existinguser/recipe-name");

  await expect.soft(usernameField).toHaveJSProperty("validationMessage", "Someone else is using this username.");

  // Shouldn't do anything.
  await page.getByRole("button", { name: "Save" }).click();

  expect((await prisma.user.findUniqueOrThrow({ where: { id: testUserId } })).username
  ).toBe("test-email");
  await expect.soft(usernameField).toHaveValue("existinguser");

  // Check that the server also rejects duplicate usernames.
  await usernameField.evaluate(el => (el as HTMLInputElement).setCustomValidity(""));
  await page.getByRole("button", { name: "Save" }).click();
  await expect.soft(page.locator("p.error")).toHaveText("Another user is already using that username.");
  await expect.soft(usernameField, "An error shouldn't lose the user's partial input.").toHaveValue("existinguser");

  await usernameField.fill("testusername");
  // Should submit this time.
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("paragraph").first()).toContainText("Your account has been updated");

  expect(await prisma.user.findUniqueOrThrow({ where: { id: testUserId } })
  ).toEqual({
    id: testUserId,
    name: "User's Display Name",
    username: "testusername",
  });
});
