import { escapeRegExp, filterListWithInitialMatchesFirst } from '@lib/util';
import type { Category } from '@prisma/client';
import {
  type Accessor,
  type Component,
  createMemo,
  createResource,
  createSignal,
  For,
  onMount,
  type Resource,
  type Setter,
  Suspense,
} from "solid-js";
import { OneRecipe, type RecipeTitleWithLinkFields } from './OneRecipe';
import { QueryDrivenTextField } from './QueryDrivenTextField';

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

export const CategoryList: Component<{
  categories: Category[];
  username?: string;
  initialQuery: string;
}> = props => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(new URLSearchParams(props.initialQuery).get("filter") ?? "");

  // Search for categories:

  const filterRE = createMemo(() => new RegExp(escapeRegExp(filter()), 'i'));

  type PendingRecipeList = {
    needRecipes: Accessor<boolean>;
    setNeedRecipes: Setter<boolean>;
    recipes: Resource<RecipeTitleWithLinkFields[]>;
  }

  const recipesByCategory = createMemo(() => {
    const username = props.username;
    return new Map<number, PendingRecipeList>(props.categories.map(category => {
      const [needRecipes, setNeedRecipes] = createSignal(false);
      const [recipes] = createResource(needRecipes, () => fetchRecipesForCategory(category.id, username));
      return [category.id, { needRecipes, setNeedRecipes, recipes }];
    }));
  });


  const filteredCategories = createMemo(() =>
    filterListWithInitialMatchesFirst(props.categories, filterRE(), c => c.name));

  function onToggleCategory(categoryId: number) {
    recipesByCategory().get(categoryId)?.setNeedRecipes(true);
  }

  // Ensure default-open categories load their recipes.
  onMount(() => {
    const initialCategories = filteredCategories();
    if (initialCategories.length === 1) {
      recipesByCategory().get(initialCategories[0]!.id)?.setNeedRecipes(true);
    }
  });

  return <>
    <QueryDrivenTextField queryParam='filter' value={filter()} onInput={setFilter}>Filter</QueryDrivenTextField>
    <section id="categories">
      <ul class="details">
        <For each={filteredCategories()}>{category =>
          <li>
            <details
              open={filteredCategories().length === 1}
              onToggle={[onToggleCategory, category.id]}>
              <summary>{category.name}</summary>
              <Suspense fallback={<p>Loading...</p>}>
                <ul>
                  <For each={recipesByCategory().get(category.id)?.recipes()}>{recipe =>
                    <li><OneRecipe recipe={recipe} /></li>
                  }</For>
                </ul>
              </Suspense>
            </details>
          </li>
        }</For>
      </ul>
    </section>
  </>;
}
