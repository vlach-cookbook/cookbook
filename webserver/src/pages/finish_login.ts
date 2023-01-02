
import { verify } from "@lib/google-auth";
import { setLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import { Prisma } from "@prisma/client";
import type { APIRoute } from "astro";

export const post: APIRoute = async ({ request, cookies, redirect }) => {
  const csrf_token_cookie = cookies.get('g_csrf_token').value
  if (!csrf_token_cookie) {
    return new Response(null, { status: 400, statusText: 'No CSRF token in Cookie.' });
  }
  const formData = await request.formData();
  const csrf_token_body = formData.get('g_csrf_token')
  if (!csrf_token_body) {
    return new Response(null, { status: 400, statusText: 'No CSRF token in post body.' });
  }
  if (csrf_token_cookie !== csrf_token_body) {
    return new Response(null, { status: 400, statusText: 'CSRF tokens differed.' });
  }

  const credential = formData.get('credential');
  if (typeof (credential) !== 'string') {
    return new Response(null, { status: 400, statusText: 'No credential posted.' });
  }
  const userInfo = await verify(credential);
  if (!userInfo) {
    return new Response(null, { status: 403, statusText: 'Invalid credential.' });
  }
  if (!userInfo.email) {
    return new Response(null, { status: 403, statusText: "Can't create a user without a verified email." });
  }

  let googleUser = await prisma.googleUser.findUnique({
    where: { gid: userInfo.sub },
    include: { User: true },
  });
  if (!googleUser) {
    const creationObject = {
      data: {
        gid: userInfo.sub,
        email: userInfo.email,
        User: {
          create: {
            // If their account doesn't have a name attached, use their email instead.
            name: userInfo.name || userInfo.email,
            // Guess at their desired username:
            username: userInfo.email.split('@')[0],
          },
        },
      },
      include: { User: true },
    };
    try {
      googleUser = await prisma.googleUser.create(creationObject);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Violated a unique constraint:
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2002.
        //
        // Assume it's the username field that's not unique.
        delete creationObject.data.User.create.username;
        googleUser = await prisma.googleUser.create(creationObject);

      } else {
        throw e;
      }
    }
  }

  await setLogin(cookies, googleUser.User);

  return redirect(new URL(request.url).searchParams.get("from") || "/", 303);
}
