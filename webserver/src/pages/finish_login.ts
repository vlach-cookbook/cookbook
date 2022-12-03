
import { verify } from "@lib/google-auth";
import { setLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
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
    googleUser = await prisma.googleUser.create({
      data: {
        gid: userInfo.sub,
        email: userInfo.email,
        User: {
          create: {
            name: userInfo.name,
          },
        },
      },
      include: { User: true },
    });
  }

  setLogin(cookies, googleUser.User);

  return redirect(new URL(request.url).searchParams.get("from") || "/", 303);
}
