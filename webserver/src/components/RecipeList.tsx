import { escapeRegExp, filterListWithInitialMatchesFirst } from '@lib/util';
import { Component, createMemo, createSignal, For } from 'solid-js';
import { OneRecipe, RecipeTitleWithLinkFields } from './OneRecipe';
import { QueryDrivenTextField } from './QueryDrivenTextField';


async function fetchRecipesForIngredient(ingredient: string, username: string | undefined) {
  const searchParams = new URLSearchParams();
  searchParams.set("name", ingredient);
  if (username) {
    searchParams.set("user", username);
  }
  let response = await fetch(`/api/recipes-with-ingredient?${searchParams.toString()}`);
  let recipes = await response.json() as {
    name: string;
    slug: string;
    author: {
      username: string;
    };
  }[];
  return recipes;
}

async function fetchRecipesForCategory(categoryId: number, username: string | undefined) {
  const searchParams = new URLSearchParams();
  searchParams.set("id", `${categoryId}`);
  if (username) {
    searchParams.set("user", username);
  }
  let response = await fetch(`/api/recipes-in-category?${searchParams.toString()}`);
  let recipes = await response.json() as {
    name: string;
    slug: string;
    author: {
      username: string;
    };
  }[];
  return recipes;
}

export const RecipeList: Component<{
  recipes: RecipeTitleWithLinkFields[];
  username?: string;
  initialQuery: string;
}> = props => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(new URLSearchParams(props.initialQuery).get("filter") ?? "");

  // Search for recipes:

  const filterRE = createMemo(() => new RegExp(escapeRegExp(filter()), 'i'));

  const filteredRecipes = createMemo(() =>
    filterListWithInitialMatchesFirst(props.recipes, filterRE(), r => r.name));

  return <>
    <QueryDrivenTextField queryParam='filter' value={filter()} onInput={setFilter}>Filter</QueryDrivenTextField>
    <section id="recipes">
      <ul>
        <For each={filteredRecipes()}>{(recipe) =>
          <li>
            <OneRecipe recipe={recipe} />
          </li>
        }</For>
      </ul>
    </section>
  </>;
}
