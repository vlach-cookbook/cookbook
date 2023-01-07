import { escapeRegExp } from '@lib/util';
import type { Category, Recipe } from '@prisma/client';
import { Accessor, Component, createMemo, createResource, createSignal, For, onCleanup, onMount, Resource, Setter, Show, Suspense } from 'solid-js';

export type RecipeTitleWithLinkFields = Pick<Recipe, 'name' | 'slug'> & {
  author: { username: string },
};

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

const OneRecipe: Component<{ recipe: RecipeTitleWithLinkFields }> = props => {
  return <a href={`/r/${props.recipe.author.username}/${props.recipe.slug}`}>{props.recipe.name}</a>
};

export const RecipeList: Component<{
  recipes: RecipeTitleWithLinkFields[];
  username?: string;
  initialQuery: string;
  allIngredients: {
    name: string;
  }[];
  allCategories: Category[];
}> = props => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(new URLSearchParams(props.initialQuery).get("filter") ?? "");

  function onFilterInput(event: InputEvent & { currentTarget: HTMLInputElement }) {
    const filter = event.currentTarget.value;
    setFilter(filter);
    const url = new URL(location.href);
    if (filter) {
      url.searchParams.set("filter", filter);
    } else {
      url.searchParams.delete("filter");
    }
    // Keep the original URL in the history, but treat "searching" as a single state.
    if (!history.state) {
      history.pushState(true, "", url);
    } else {
      history.replaceState(true, "", url);
    }
  }

  function onSubmit(e: Event) {
    // If the user presses 'enter', instead of reloading the page, just add a history entry.
    history.pushState(true, "", location.href);
    e.preventDefault();
  }

  onMount(() => {
    function listener() {
      setFilter(new URLSearchParams(location.search).get("filter") ?? "");
    }
    window.addEventListener("popstate", listener);
    onCleanup(() => window.removeEventListener("popstate", listener));
  });

  // Search for recipes:

  const filterRE = createMemo(() => new RegExp(escapeRegExp(filter()), 'i'));

  const sortCollator = new Intl.Collator();

  /** Filters a list of items so that |filter| matches projection(item). Then sorts the list so
   * items that start with |filter| appear first, and everything's alphabetical by projection(item).
   *
   * @returns a new list
   */
  function filterListWithInitialMatchesFirst<T>(
    list: Iterable<T>,
    filter: RegExp,
    projection: (item: T) => string) {
    const filtered = Array.from(list, item => {
      const proj = projection(item);
      return [proj.search(filter), proj, item] as const;
    }).filter(([index, _1, _2]) => index !== -1);
    filtered.sort(([index1, proj1, _1], [index2, proj2, _2]) => {
      const atStart1 = index1 === 0;
      const atStart2 = index2 === 0;
      if (atStart1 !== atStart2) {
        return atStart1 ? -1 : 1;
      }
      return sortCollator.compare(proj1, proj2);
    });
    return filtered.map(([_1, _2, item]) => item);
  }

  type PendingRecipeList = {
    needRecipes: Accessor<boolean>;
    setNeedRecipes: Setter<boolean>;
    recipes: Resource<RecipeTitleWithLinkFields[]>;
  }

  const recipesByIngredient = createMemo(() => {
    const username = props.username;
    return new Map<string, PendingRecipeList>(props.allIngredients.map(ingredient => {
      const [needRecipes, setNeedRecipes] = createSignal(false);
      const [recipes] = createResource(needRecipes, () => fetchRecipesForIngredient(ingredient.name, username));
      return [ingredient.name, { needRecipes, setNeedRecipes, recipes }];
    }));
  });

  const recipesByCategory = createMemo(() => {
    const username = props.username;
    return new Map<number, PendingRecipeList>(props.allCategories.map(category => {
      const [needRecipes, setNeedRecipes] = createSignal(false);
      const [recipes] = createResource(needRecipes, () => fetchRecipesForCategory(category.id, username));
      return [category.id, { needRecipes, setNeedRecipes, recipes }];
    }));
  });


  const filteredCategories = createMemo(() =>
    filterListWithInitialMatchesFirst(props.allCategories, filterRE(), c => c.name));
  const filteredRecipes = createMemo(() =>
    filterListWithInitialMatchesFirst(props.recipes, filterRE(), r => r.name));
  const filteredIngredients = createMemo(() =>
    filterListWithInitialMatchesFirst(props.allIngredients, filterRE(), i => i.name));

  function onToggleIngredient(ingredient: string) {
    recipesByIngredient().get(ingredient)?.setNeedRecipes(true);
  }
  function onToggleCategory(categoryId: number) {
    recipesByCategory().get(categoryId)?.setNeedRecipes(true);
  }

  // Ensure default-open ingredients and categories load their recipes.
  const initialCategories = filteredCategories();
  if (initialCategories.length === 1) {
    recipesByCategory().get(initialCategories[0]!.id)?.setNeedRecipes(true);
  }
  const initialIngredients = filteredIngredients();
  if (initialIngredients.length === 1) {
    recipesByIngredient().get(initialIngredients[0]!.name)?.setNeedRecipes(true);
  }

  return <>
    <form onSubmit={onSubmit}>
      <label>Filter <input type="search" name="filter" value={filter()}
        onInput={onFilterInput} autofocus /></label>
    </form>
    <div style={{ display: "flex", "flex-wrap": "wrap", gap: "1em" }}>
      <section style={{ "min-width": "12em", flex: "1 0" }}>
        <h2>Recipes</h2>
        <ul>
          <For each={filteredRecipes()}>{(recipe) =>
            <li>
              <OneRecipe recipe={recipe} />
            </li>
          }</For>
        </ul>
      </section>
      <Show when={filter() && (filteredCategories().length > 0 || filteredIngredients().length > 0)}>
        <div style={{ "min-width": "15em", flex: "1 0" }}>
          <Show when={filteredCategories().length > 0}>
            <section>
              <h3>Categories</h3>
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
          </Show>
          <Show when={filteredIngredients().length > 0}>
            <section>
              <h3>Ingredients</h3>
              <ul class="details">
                <For each={filteredIngredients()}>{ingredient =>
                  <li>
                    <details
                      open={filteredIngredients().length === 1}
                      onToggle={[onToggleIngredient, ingredient.name]}>
                      <summary>{ingredient.name}</summary>
                      <Suspense fallback={<p>Loading...</p>}>
                        <ul>
                          <For each={recipesByIngredient().get(ingredient.name)?.recipes()}>{recipe =>
                            <li><OneRecipe recipe={recipe} /></li>
                          }</For>
                        </ul>
                      </Suspense>
                    </details>
                  </li>
                }</For>
              </ul>
            </section>
          </Show>
        </div>
      </Show>
    </div>
  </>;
}
