import { prisma } from '@lib/prisma';
import { BrowserContext, test as base } from '@playwright/test';
import type { Category, Recipe, RecipeIngredient, Session, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

// The creation fixtures all delete the things they created at the end of the test.
type Fixtures = {
  testUser: {
    create: (user: Prisma.UserCreateWithoutSessionsInput) => Promise<User>;
  };
  testSession: {
    create: (sessionId: string,
      { user }: { user: Prisma.UserCreateWithoutSessionsInput; }) => Promise<Session & { user: User }>;
    addLoginCookie(browserContext: BrowserContext, sessionId: string): void;
  };
  testLogin: {
    session: Session & { user: User },
    userId: string,
    username: string,
  };
  testCategory: {
    create: (name: string) => Promise<Category>;
  };
  testRecipe: {
    create: (recipe: Prisma.RecipeCreateInput) => Promise<Recipe & { ingredients: RecipeIngredient[]; }>;
  };
};

export const test = base.extend<Fixtures>({
  testUser: async ({ }, use) => {
    const userIds: string[] = [];
    await use({
      async create(user) {
        try {
          const dbUser = await prisma.user.create({ data: user });
          userIds.push(dbUser.id);
          return dbUser;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError
            && e.code === "P2002"
            && ((e.meta?.target ?? []) as string[]).includes("username")) {
            const allUsernames = (await prisma.user.findMany({
              select: { username: true },
              orderBy: { username: "asc" }
            })).map(u => u.username);
            throw new Error(
              `Username ${user.username} already exists. Existing usernames: [${allUsernames.join(", ")}]`,
              { cause: e });
          } else {
            throw e;
          }
        }
      }
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  },
  testSession: async ({ testUser }, use) => {
    await use({
      async create(sessionId, { user }) {
        const dbUser = await testUser.create(user);
        const session = await prisma.session.create({
          data: {
            id: sessionId,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
            user: { connect: { id: dbUser.id } }
          },
          include: { user: true },
        });
        return session;
      },
      addLoginCookie(browserContext, sessionId) {
        browserContext.addCookies([{
          "name": "Login",
          "value": sessionId,
          "domain": "localhost",
          "path": "/",
          "expires": -1,
          "httpOnly": true,
          "secure": true,
          "sameSite": "Lax"
        }]);
      }
    });
  },
  testLogin: async ({ context, testSession }, use) => {
    const sessionId = 'Login for Test';
    const session = await testSession.create(sessionId, {
      user: {
        name: "Test User's Name",
        username: 'testuser',
      }
    });
    testSession.addLoginCookie(context, sessionId);
    await use({ session, userId: session.userId, username: session.user.username! });
  },
  testCategory: async ({ }, use) => {
    await use({
      async create(name) {
        return await prisma.category.upsert({ where: { name }, create: { name }, update: {} });
      }
    });
  },
  testRecipe: async ({ }, use) => {
    const recipeIds: number[] = [];
    await use({
      async create(recipe) {
        try {
          const dbRecipe = await prisma.recipe.create({
            data: recipe,
            include: { ingredients: true }
          });
          recipeIds.push(dbRecipe.id);
          return dbRecipe;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError
            && e.code === "P2002") {
            const allNames = await prisma.recipe.findMany({ select: { name: true, slug: true } });
            throw new Error(
              `${e.message}: Trying to create recipe ${JSON.stringify(recipe)}.
Existing recipe names: [${allNames.map(r => r.name).join(", ")}]
Existing recipe slugs: [${allNames.map(r => r.slug).join(", ")}]`,
              { cause: e });
          } else {
            throw e;
          }
        }
      }
    });
    await prisma.recipe.deleteMany({ where: { id: { in: recipeIds } } });

  },
});
