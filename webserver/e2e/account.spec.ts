import { prisma } from '@lib/prisma.js';
import { usernameRegex } from '@lib/valid-username';
import { expect, test } from '@playwright/test';

let userIds: string[] = [];

test.afterEach(async () => {
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  userIds = [];
});

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

test('Empty user needs to pick a unique username', async ({ page }) => {
  const otherUser = await prisma.user.create({
    data: {
      name: "Existing User",
      username: "existinguser",
    }
  });
  userIds.push(otherUser.id);
  const sessionId = "Session for Test Empty User";
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      user: {
        create: {
          GoogleUser: {
            create: {
              gid: "Test Google SID",
              email: "test-email@gmail.com"
            }
          }
        }
      }
    },
    include: { user: { include: { GoogleUser: true } } }
  });
  const testUserId = session.user.id;
  userIds.push(testUserId);
  page.context().addCookies([{
    "name": "Login",
    "value": sessionId,
    "domain": "localhost",
    "path": "/",
    "expires": -1,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  }]);

  await page.goto('/account');

  await expect.soft(page.getByText(/Your recipes will appear/))
    .toContainText("/r/your-username/recipe-name");

  await page.getByLabel("Display Name").fill("User's Display Name");
  const usernameField = page.getByLabel("Username");
  await usernameField.fill("existinguser");

  await expect.soft(page.getByText(/Your recipes will appear/))
    .toContainText("/r/existinguser/recipe-name");

  await expect.soft(usernameField).toHaveJSProperty("validationMessage", "Someone else is using this username.");

  // Shouldn't do anything.
  await page.getByRole("button", { name: "Save" }).click();

  expect((await prisma.user.findUniqueOrThrow({ where: { id: testUserId } })).username
  ).toBe(null);
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
