import { prisma } from '@lib/prisma';
import { BrowserContext, test as base } from '@playwright/test';
import type { Prisma, Session, User } from '@prisma/client';

type Fixtures = {
  testSession: {
    create: (sessionId: string,
      { user }: { user: Prisma.UserCreateNestedOneWithoutSessionsInput; }) => Promise<Session & { user: User }>;
    addLoginCookie(browserContext: BrowserContext, sessionId: string): void;
  };
  testLogin: {
    session: Session & { user: User },
    userId: string,
    username: string,
  };
};

export const test = base.extend<Fixtures>({
  testSession: async ({ }, use) => {
    const userIds: string[] = [];
    await use({
      async create(sessionId, { user }) {
        const session = await prisma.session.create({
          data: {
            id: sessionId,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
            user
          },
          include: { user: true },
        });
        userIds.push(session.userId);
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
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  },
  testLogin: async ({ context, testSession }, use) => {
    const sessionId = 'Login for Test';
    const session = await testSession.create(sessionId, {
      user: {
        connectOrCreate: {
          where: { username: 'testuser' },
          create: {
            name: "Test User's Name",
            username: 'testuser',
          }
        }
      }
    });
    testSession.addLoginCookie(context, sessionId);
    await use({ session, userId: session.userId, username: session.user.username! });
  },
});
