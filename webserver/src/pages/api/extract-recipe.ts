import type { APIRoute } from "astro";
import { Writer } from 'n3';
import { extractRdfFromHtml, parseRecipesFromRdf } from "@lib/parse-recipe";

export const GET: APIRoute = async ({ url, request }) => {
  const params = url.searchParams;
  const source = params.get('url');
  if (!source) {
    return new Response('Missing ?url parameter.', { status: 400 });
  }
  const data = await extractRdfFromHtml(source);
  if (data === undefined) {
    return new Response(`Failed to parse a recipe from ${source}`, { status: 400 });
  }
  const { store, finalUrl, documentOrder } = data;

  const accept = params.get('accept') ?? request.headers.get('accept') ?? 'application/json';
  if (accept.split(';')[0] === 'text/turtle') {
    const writer = new Writer({ prefixes: { s: 'https://schema.org/' } });
    writer.addQuads(store.getQuads(null, null, null, null));
    let turtle: string = "";
    writer.end((_, result) => { turtle = result; });
    return new Response(turtle, {
      headers: {
        'content-type': 'text/turtle; charset=utf-8',
      }
    });
  }

  const recipes = parseRecipesFromRdf(store, finalUrl, documentOrder);
  return new Response(JSON.stringify(recipes), {
    headers: {
      'content-type': 'application/json',
    }
  })
};
