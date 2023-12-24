import type { APIRoute } from "astro";
import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import { parseIntOrUndefined } from "@lib/forms";

function getString(formData: FormData, fieldName: string) {
  const result = formData.get(fieldName);
  if (typeof result === 'string') {
    return result;
  }
  return null;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();

  const user = await getLogin(cookies);
  if (!user) {
    return redirect(getString(formData, 'from') ?? import.meta.env.BASE_URL);
  }

  const draftId = parseIntOrUndefined(getString(formData, 'draftId'));
  if (draftId) {
    await prisma.draftRecipe.delete({
      where: {
        id: draftId,
        User: { id: user.id },
      },
    });
  }

  return redirect(getString(formData, 'from') ?? import.meta.env.BASE_URL);
}
