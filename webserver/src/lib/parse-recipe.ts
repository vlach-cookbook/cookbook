import { Store, Quad } from "n3";
import { Prefix, Subject, allOfType, isLiteral, nodeValue, nodeValueOrUndefined, nodeValues, rewriteSchema } from "./rdf";
import { parseIntOrUndefined } from "./forms";
import rdfDereferencerWrapper from "rdf-dereference";
import type { JsonRecipe, JsonRecipeIngredient } from "./json-recipe";

// Workaround for https://github.com/rubensworks/rdf-dereference.js/issues/44.
const rdfDereferencer: typeof rdfDereferencerWrapper = (rdfDereferencerWrapper as any).default;

export async function parseRecipesFromUrl(url: string): Promise<JsonRecipe[]> {
  const rdf = await extractRdfFromHtml(url);
  if (rdf === undefined) return [];
  return parseRecipesFromRdf(rdf.store, rdf.finalUrl, rdf.documentOrder);
}

export async function extractRdfFromHtml(source: string): Promise<{ store: Store, finalUrl: string, documentOrder: Map<string, number> } | undefined> {
  const { data, url: finalUrl } = await rdfDereferencer.dereference(source, {
    headers: { 'User-Agent': 'github.com/vlach-cookbook/cookbook' }
  });
  const store = new Store();
  const documentOrder = new Map<string, number>();
  await new Promise((resolve, reject) => {
    data.on('data', (quad: Quad) => {
      if (!documentOrder.has(quad.subject.id)) {
        documentOrder.set(quad.subject.id, documentOrder.size);
      }
      if (!documentOrder.has(quad.object.id)) {
        documentOrder.set(quad.object.id, documentOrder.size);
      }
      const { subject, predicate, object, graph } = quad;
      store.add(new Quad(subject, rewriteSchema(predicate), rewriteSchema(object), graph));
    });
    data.on('error', (e: any) => reject(e));
    data.on('end', () => resolve(store));
  });

  return { store, finalUrl, documentOrder };
}

const s = Prefix('https://schema.org/');

export function parseRecipesFromRdf(store: Store, finalUrl: string, documentOrder: Map<string, number>): JsonRecipe[] {
  const recipes = allOfType(store, s('Recipe'));
  return recipes.map(r => ({
    name: nodeValues(r.get(s('name')))[0],
    recipeYield: nodeValues(r.get(s('recipeYield'))).filter(servings => /^\s*\d+\s*$/.test(servings))[0],
    recipeIngredient: r.get(s('recipeIngredient'), documentOrder).flatMap(parseIngredient) ?? [],
    recipeInstructions: orderListItems(r.get(s('recipeInstructions'), documentOrder).map(parseStep)) ?? [],
    recipeCategory: nodeValues(r.get(s('recipeCategory'))).map(category => category.trim()) ?? [],
    sourceUrl: finalUrl,
  }));
}

export function parseIngredient(recipeIngredient: Subject): JsonRecipeIngredient | [] {
  if (isLiteral(recipeIngredient.node)) {
    const fullIngredient = nodeValue(recipeIngredient.node);
    const match = /^(?<quantity>(?:\p{P}|\p{S}|\p{N}|\p{Zs})+)?(?<unitAndName>[^,]+)(?:,(?<detail>.*))?$/u.exec(fullIngredient);
    if (match === null) {
      return [];
    }
    let { quantity, unitAndName, detail } = match.groups!;
    if (!unitAndName) {
      return [];
    }
    quantity = quantity?.trim();
    unitAndName = unitAndName.trim();
    detail = detail?.trim();
    // TODO: Use a real list of units.
    const unitMatch = /^(?<unit>\P{Zs}+)\p{Zs}+/u.exec(unitAndName);
    const unit = unitMatch?.groups!.unit;
    const name = unit ? unitAndName.slice(unitMatch[0].length) : unitAndName;
    return { quantity, unit, name, preparation: detail };
  } else {
    const nameAndPreparation = nodeValueOrUndefined(recipeIngredient.get(s("name"))[0]);
    if (nameAndPreparation === undefined) { return []; }
    const { name, preparation } = /^(?<name>[^,]+)(?:,(?<preparation>.*))?$/.exec(nameAndPreparation)?.groups ?? { name: undefined, preparation: undefined };
    const quantitativeValue = recipeIngredient.get(s("requiredQuantity"))[0];
    const quantity = nodeValueOrUndefined(quantitativeValue?.get(s('value'))[0])?.trim();
    const unit = nodeValueOrUndefined(quantitativeValue?.get(s('unitText'))[0])?.trim();
    if (name === undefined) { return []; }
    return { quantity, unit, name: name.trim(), preparation: preparation?.trim() };
  }
}

type ListItem<T> = { position?: number, value: T };

/// Parses a step in recipe instructions that could be a plain string value or a
/// HowToStep with optional position and text properties.
///
/// TODO: Handle HowToSections and HowToSteps that contain HowToDirections and
/// HowToTips, if those actually exist in real recipes.
function parseStep(step: Subject): { position?: number, value: string } | undefined {
  if (isLiteral(step.node)) {
    return { value: nodeValue(step.node) };
  } else {
    const position = parseIntOrUndefined(nodeValueOrUndefined(step.get(s('position'))[0]));
    const value = nodeValueOrUndefined(step.get(s('text'))[0]);
    if (value === undefined) { return undefined; }
    return { position, value };
  }
}

function orderListItems<T>(items: Array<ListItem<T> | undefined>): T[] {
  return items.filter((step): step is ListItem<T> => step !== undefined)
    .sort(compareListItems)
    .map(({ value }) => value);
}

function compareListItems<T>(a: ListItem<T>, b: ListItem<T>): number {
  // Put undefined positions at the beginning of the list.
  if (a.position === undefined) {
    if (b.position == undefined) return 0;
    return -1;
  }
  if (b.position === undefined) {
    return 1;
  }
  return a.position - b.position;
}
