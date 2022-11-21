import { prisma } from "@lib/prisma";
import type { Secret, User } from "@prisma/client";
import type { AstroCookies } from "astro/dist/core/cookies";
import cookie from 'cookie-signature';
import assert from "node:assert";
import crypto from 'node:crypto';
import util from 'node:util';

const LOGIN_COOKIE_NAME = 'Login';

const generateKey = util.promisify(crypto.generateKey);

let cookieKeySecret: Secret | null = await prisma.secret.findUnique({
  where: { name: "cookie_key" }
});
if (!cookieKeySecret) {
  const new_key = await generateKey('hmac', { length: 256 });
  cookieKeySecret = await prisma.secret.create({
    data: { name: "cookie_key", value: [new_key.export()] }
  })
}
let cookieKeys: crypto.KeyObject[] = cookieKeySecret.value.map(key => crypto.createSecretKey(key));
assert(cookieKeys.length > 0);
assert(cookieKeys.every(key => key.type === 'secret'));

export function setLogin(cookies: AstroCookies, user: User): void {
  const firstKey = cookieKeys[0];
  assert(firstKey !== undefined);
  const cookie_value = cookie.sign(user.id, firstKey);
  cookies.set(LOGIN_COOKIE_NAME, cookie_value, {
    secure: true,
    httpOnly: true,
    path: '/',
    maxAge: 31 * 24 * 60 * 60
  });
}

export async function getLogin(cookies: AstroCookies): Promise<User | null> {
  const cookie_value = cookies.get(LOGIN_COOKIE_NAME).value;
  if (!cookie_value) return null;
  let user_id: string | false = false;
  for (const key of cookieKeys) {
    user_id = cookie.unsign(cookie_value, key);
    if (user_id) break;
  }
  if (!user_id) {
    cookies.delete(LOGIN_COOKIE_NAME, { path: '/' });
    return null;
  }
  return await prisma.user.findUnique({ where: { id: user_id } });
}
