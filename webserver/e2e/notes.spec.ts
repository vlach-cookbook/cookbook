import { prisma } from '@lib/prisma.js';
import { expect } from '@playwright/test';
import { test } from './fixtures.js';
import { getSectionByHeading } from './util.js';

test("Renders a recipe's notes", async ({ page, testUser, testRecipe }) => {
  const user = await testUser.create({ username: 'testuser', name: "User Name" });
  const note_user = await testUser.create({ username: 'noteuser', name: "Left a Note" });
  await testRecipe.create({
    author: { connect: { id: user.id } },
    name: "Test Recipe",
    slug: "test-recipe",
    notes: {
      create: [
        {
          author: { connect: { id: user.id } },
          createdAt: new Date("2023-01-14T09:30:52"),
          content: "* First\n* Second",
        }, {
          author: { connect: { id: note_user.id } },
          createdAt: new Date("2023-01-13T17:43:12"),
          content: "First note!",
        }
      ]
    }
  })
  await page.goto('/r/testuser/test-recipe');

  await expect.soft(page).toHaveTitle("Test Recipe");
  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')).toContainText([
    "Left a Note",
    "User Name",
  ]);

  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "Left a Note" }).getByRole('link')).toHaveText("Left a Note");
  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "Left a Note" }).getByRole('time')).toHaveText("Jan 13, 2023, 5:43 PM");
  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "Left a Note" }).getByRole('paragraph')).toHaveText("First note!")

  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "User Name" }).getByRole('link')).toHaveText("User Name");
  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "User Name" }).getByRole('time')).toHaveText("Jan 14, 2023, 9:30 AM");
  await expect.soft(getSectionByHeading(page, 'Notes')
    .getByRole('listitem').filter({ hasText: "User Name" }).getByRole('listitem')).toHaveText([
      "First",
      "Second",
    ]);
});

test("Omits other users' hidden and private notes", async ({ page, testLogin, testUser, testRecipe }) => {
  const { userId } = testLogin;
  const recipe_user = await testUser.create({ username: 'recipeuser', name: "Made the Recipe" });
  const note_user = await testUser.create({ username: 'noteuser', name: "Left a Note" });
  await testRecipe.create({
    author: { connect: { id: recipe_user.id } },
    name: "Test Recipe",
    slug: "test-recipe",
    notes: {
      create: [{
        author: { connect: { id: note_user.id } },
        createdAt: new Date("2023-01-13"),
        public: true,
        hidden: false,
        content: "Other user's public note",
      }, {
        author: { connect: { id: note_user.id } },
        createdAt: new Date("2023-01-14"),
        public: false,
        hidden: false,
        content: "Other user's private note",
      }, {
        author: { connect: { id: note_user.id } },
        createdAt: new Date("2023-01-15"),
        public: true,
        hidden: true,
        content: "Other user's hidden note",
      }, {
        author: { connect: { id: note_user.id } },
        createdAt: new Date("2023-01-16"),
        public: false,
        hidden: true,
        content: "Other user's hidden private note",
      }, {
        author: { connect: { id: userId } },
        createdAt: new Date("2023-01-17"),
        public: true,
        hidden: false,
        content: "My public note",
      }, {
        author: { connect: { id: userId } },
        createdAt: new Date("2023-01-18"),
        public: false,
        hidden: false,
        content: "My private note",
      }, {
        author: { connect: { id: userId } },
        createdAt: new Date("2023-01-19"),
        public: true,
        hidden: true,
        content: "My hidden note",
      }, {
        author: { connect: { id: userId } },
        createdAt: new Date("2023-01-20"),
        public: false,
        hidden: true,
        content: "My hidden private note",
      }]
    }
  })
  await page.goto(`/r/recipeuser/test-recipe`);

  await expect.soft(page).toHaveTitle("Test Recipe");
  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')).toContainText([
    "Other user's public note",
    "My public note",
    "My private note",
    "My hidden note",
    "My hidden private note",
  ]);
  for (const content of [
    "Other user's private note",
    "Other user's hidden note",
    "Other user's hidden private note",]) {
    await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')).not.toContainText([content]);
  }
  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')
    .filter({ hasText: "My private note" })).toContainText("Private");
  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')
    .filter({ hasText: "My hidden note" })).toContainText("Hidden");

  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')
    .filter({ hasText: "My hidden private note" })).toContainText("Private");
  await expect.soft(getSectionByHeading(page, 'Notes').getByRole('listitem')
    .filter({ hasText: "My hidden private note" })).not.toContainText("Hidden");
});

test("Can add a note", async ({ page, testLogin, testUser, testRecipe }) => {
  const { userId } = testLogin
  const recipeUser = await testUser.create({ username: 'recipeuser', name: "Wrote the Recipe" });
  const recipe = await testRecipe.create({
    author: { connect: { id: recipeUser.id } },
    name: "Test Recipe",
    slug: "test-recipe",
  })
  await page.goto('/r/recipeuser/test-recipe');

  const clickTime = Date.now();
  await page.getByRole('button', { name: "Add note" }).click();

  await expect.soft(getSectionByHeading(page, 'Notes').getByRole("textbox")).toBeFocused();
  await getSectionByHeading(page, 'Notes').getByRole("textbox").fill("This is a new note.");
  await page.getByRole('button', { name: "Save" }).click();

  const note = await prisma.recipeNote.findFirst({ where: { recipe: { id: recipe.id } } });
  expect.soft(note?.authorId).toEqual(userId);
  expect.soft(note?.hidden).toBe(false);
  expect.soft(note?.public).toBe(true);

  const noteElemId = new URL(page.url()).hash;
  expect(noteElemId).toContain(String(note?.id));

  await expect.soft(page.locator(noteElemId)).toContainText("This is a new note.");
  const noteTimeString = await getSectionByHeading(page, 'Notes').getByRole('time').getAttribute("datetime");
  expect(noteTimeString).toBeTruthy();
  const noteTime = new Date(noteTimeString!);
  expect.soft(noteTime.getTime()).toBeGreaterThanOrEqual(clickTime);
  expect.soft(noteTime.getTime()).toBeLessThanOrEqual(Date.now());
});

test("Can hide a note on your recipe", async ({ page, testLogin, testUser, testRecipe }) => {
  const { userId, username } = testLogin
  const noteUser = await testUser.create({ username: 'noteuser', name: "Wrote a Note" });
  const recipe = await testRecipe.create({
    author: { connect: { id: userId } },
    name: "Test Recipe",
    slug: "test-recipe",
    notes: {
      create: [
        {
          author: { connect: { id: noteUser.id } },
          content: "This note should be hidden.",
        }
      ]
    },
  });

  await page.goto(`/r/${username}/test-recipe`);

  await expect.soft(getSectionByHeading(page, 'Notes')).toContainText("This note should be hidden.");

  // Should pop up a confirm dialog to check the recipe author actually wants to hide the note.
  let dialogType: string | undefined, dialogMessage: string | undefined;
  page.once('dialog', dialog => {
    dialogType = dialog.type();
    dialogMessage = dialog.message();
    dialog.dismiss()
  });
  await getSectionByHeading(page, 'Notes').getByRole('button', { name: "Hide" }).click();
  expect(dialogType).toEqual("confirm");
  expect(dialogMessage).toMatch(/Wrote a Note/);
  await expect.soft(getSectionByHeading(page, 'Notes')).toContainText("This note should be hidden.");

  page.once('dialog', dialog => dialog.accept());
  await getSectionByHeading(page, 'Notes').getByRole('button', { name: "Hide" }).click();
  await expect.soft(getSectionByHeading(page, 'Notes')).not.toContainText("This note should be hidden.");

  const notes = await prisma.recipeNote.findMany({ where: { recipe: { id: recipe.id } } });
  expect(notes).toMatchObject([{ content: "This note should be hidden.", hidden: true }]);
});

for (const recipeOwner of ["your", "other's"]) {
  test(`Can edit a note on ${recipeOwner} recipe`, async ({ page, testLogin, testUser, testRecipe }) => {
    const { userId, username } = testLogin;
    const recipeUser = await testUser.create({ username: 'recipeuser', name: "Wrote the Recipe" });
    await testRecipe.create({
      author: { connect: { id: recipeOwner === "your" ? userId : recipeUser.id } },
      name: "Test Recipe",
      slug: "test-recipe",
      notes: {
        create: [
          {
            author: { connect: { id: userId } },
            content: "Will edit this note.",
          }
        ]
      },
    });

    await page.goto(`/r/${recipeOwner === "your" ? username : recipeUser.username}/test-recipe`);

    await expect.soft(getSectionByHeading(page, 'Notes')).toContainText("Will edit this note.");
    await expect.soft(getSectionByHeading(page, 'Notes').getByRole('button', { name: "Hide" })).toHaveCount(0);
    await getSectionByHeading(page, 'Notes').getByRole('button', { name: "✏️" }).click();

    await expect.soft(getSectionByHeading(page, 'Notes').getByRole("textbox")).toBeFocused();
    await getSectionByHeading(page, 'Notes').getByRole("textbox").fill("Just edited.");
    await getSectionByHeading(page, 'Notes').getByRole("checkbox", { name: "Public" }).uncheck();
    await getSectionByHeading(page, 'Notes').getByRole('button', { name: "Save" }).click();

    await expect.soft(getSectionByHeading(page, 'Notes')).toContainText("Just edited.");
    await expect.soft(getSectionByHeading(page, 'Notes')).toContainText("Private");
  });
}
