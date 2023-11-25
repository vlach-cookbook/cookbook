import { escapeRegExp, filterListWithInitialMatchesFirst } from '@lib/util';
import { type Accessor, type Component, createMemo, createResource, createSignal, For, type Resource, type Setter, Suspense } from 'solid-js';
import { OneRecipe, type RecipeTitleWithLinkFields } from './OneRecipe';
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

export const IngredientList: Component<{
  ingredients: { name: string; }[];
  username?: string;
  initialQuery: string;
}> = props => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(new URLSearchParams(props.initialQuery).get("filter") ?? "");

  // Search for ingredients:

  const filterRE = createMemo(() => new RegExp(escapeRegExp(filter()), 'i'));

  type PendingRecipeList = {
    needRecipes: Accessor<boolean>;
    setNeedRecipes: Setter<boolean>;
    recipes: Resource<RecipeTitleWithLinkFields[]>;
  }

  const recipesByIngredient = createMemo(() => {
    const username = props.username;
    return new Map<string, PendingRecipeList>(props.ingredients.map(ingredient => {
      const [needRecipes, setNeedRecipes] = createSignal(false);
      const [recipes] = createResource(needRecipes, () => fetchRecipesForIngredient(ingredient.name, username));
      return [ingredient.name, { needRecipes, setNeedRecipes, recipes }];
    }));
  });

  const filteredIngredients = createMemo(() =>
    filterListWithInitialMatchesFirst(props.ingredients, filterRE(), i => i.name));

  function onToggleIngredient(ingredient: string) {
    recipesByIngredient().get(ingredient)?.setNeedRecipes(true);
  }
  const initialIngredients = filteredIngredients();
  if (initialIngredients.length === 1) {
    recipesByIngredient().get(initialIngredients[0]!.name)?.setNeedRecipes(true);
  }

  return <>
    <section id="ingredients">
      <QueryDrivenTextField queryParam='filter' value={filter()} onInput={setFilter}>Filter</QueryDrivenTextField>
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
  </>;
}
