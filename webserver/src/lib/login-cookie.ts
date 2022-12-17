import { prisma } from "@lib/prisma";
import type { User } from "@prisma/client";
import type { AstroCookies } from "astro/dist/core/cookies";
import crypto from 'node:crypto';
import util from 'node:util';

const LOGIN_COOKIE_NAME = 'Login';

const randomBytes = util.promisify(crypto.randomBytes);

export async function setLogin(cookies: AstroCookies, user: User | null): Promise<void> {
  if (user == null) {
    cookies.delete(LOGIN_COOKIE_NAME);
    return;
  }
  const sessionId = (await randomBytes(128 / 8)).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + 31);
  await prisma.session.create({
    data: {
      // 2^-128 chance of collision; just let it cause a 500.
      id: sessionId,
      user: { connect: { id: user.id } },
      expires,
    }
  });
  cookies.set(LOGIN_COOKIE_NAME, sessionId, {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: 31 * 24 * 60 * 60
  });
}

export async function getLogin(cookies: AstroCookies): Promise<User | null> {
  const sessionId = cookies.get(LOGIN_COOKIE_NAME).value;
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  const now = new Date();
  if (session.expires < now) {
    prisma.session.deleteMany({
      where: { expires: { lte: now } }
    }).catch(e => console.error(e.stack || e));
    cookies.delete(LOGIN_COOKIE_NAME, { path: '/' });
    return null;
  }
  return session.user;
}
