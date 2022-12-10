
import { setLogin } from "@lib/login-cookie";
import type { APIRoute } from "astro";

export const get: APIRoute = async ({ request, cookies, redirect }) => {
  await setLogin(cookies, null);

  return redirect(new URL(request.url).searchParams.get("from") || "/", 303);
}
