import { parseIntOrUndefined, structureFormData } from "@lib/forms";
import { getLogin } from "@lib/login-cookie";
import { prisma } from "@lib/prisma";
import type { Prisma, Recipe, RecipeNote, User } from "@prisma/client";
import type { APIRoute } from "astro";

const recipeUrlFields = {
  select: {
    slug: true,
    authorId: true,
    author: { select: { username: true } }
  }
} as const satisfies Prisma.RecipeArgs;

export const post: APIRoute = async ({ request, redirect, cookies }) => {
  function redirectToNote(note: RecipeNote & {
    recipe: Pick<Recipe, "slug" | "authorId"> & { author: Pick<User, "username"> }
  }) {
    return redirect(
      `/r/${note.recipe.author.username}/${note.recipe.slug}#note-${note.id}`
    );
  }

  const formData = structureFormData(await request.formData());

  const user = await getLogin(cookies);
  if (!user) {
    return new Response(undefined, { status: 403 });
  }

  let noteId = parseIntOrUndefined(formData.noteId);
  let existingNote: null | RecipeNote & {
    recipe: Pick<Recipe, "slug" | "authorId"> & { author: Pick<User, "username"> }
  } = null;
  if (noteId) {
    existingNote = await prisma.recipeNote.findUnique({
      where: { id: noteId },
      include: { recipe: recipeUrlFields, },
    });

    if (!existingNote) {
      return new Response(undefined, { status: 404 });
    }

    // Let a recipe's author hide notes on that recipe. They don't need to hide their own notes;
    // just set those to private.
    if (existingNote.authorId !== user.id && existingNote.recipe.authorId === user.id) {
      let hidden: boolean | undefined = undefined;
      if (formData.hide === "on") {
        hidden = true;
      } else if (formData.show === "on") {
        // Make sure we only un-hide notes if the submitted form intended to do that. Accidentally
        // submitting an empty form should do nothing.
        hidden = false;
      } else {
        // The recipe author can't edit other people's notes except to change their hidden status,
        // so just go back to the note.
        return redirectToNote(existingNote);
      }
      await prisma.recipeNote.update({
        where: { id: noteId },
        data: { hidden },
      });
      return redirectToNote(existingNote);
    }
  }

  if (existingNote && user.id !== existingNote.authorId) {
    // Can't edit a note that's not yours.
    return new Response(undefined, { status: 403 });
  }

  const noteData: Prisma.RecipeNoteUpdateInput & Omit<Prisma.RecipeNoteCreateInput, "author" | "recipe"> = {
    public: formData.public === "on",
  };
  if (typeof formData.content === "string") {
    noteData.content = formData.content;
  }
  let timezoneOffset = parseIntOrUndefined(formData.timezoneOffset);
  if (typeof formData.createdAt === "string" && timezoneOffset !== undefined) {
    const createdAt = Date.parse(formData.createdAt);
    if (!isNaN(createdAt)) {
      noteData.createdAt = new Date(createdAt + timezoneOffset * 60 * 1000);
    }
  }

  if (existingNote) {
    await prisma.recipeNote.update({
      where: { id: noteId },
      data: noteData,
    });
    return redirectToNote(existingNote);
  } else {
    // Create a new note.
    const recipeId = parseIntOrUndefined(formData.recipeId);
    if (!recipeId) {
      return new Response(undefined, { status: 400 });
    }

    const result = await prisma.recipeNote.create({
      data: {
        ...noteData,
        recipe: {
          connect: { id: recipeId }
        },
        author: {
          connect: { id: user.id }
        },
      },
      include: { recipe: recipeUrlFields, },
    });
    return redirect(
      `/r/${result.recipe.author.username}/${result.recipe.slug}#note-${result.id}`
    );
  }
};
