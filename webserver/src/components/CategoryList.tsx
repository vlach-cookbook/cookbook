import { escapeRegExp, filterListWithInitialMatchesFirst } from "@lib/util";
import type { Category } from "@prisma/client";
import { actions } from "astro:actions";
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
import { OneRecipe, type RecipeTitleWithLinkFields } from "./OneRecipe";
import { QueryDrivenTextField } from "./QueryDrivenTextField";

export const CategoryList: Component<{
  categories: Category[];
  initialQuery: string;
}> = (props) => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(
    new URLSearchParams(props.initialQuery).get("filter") ?? ""
  );

  // Search for categories:

  const filterRE = createMemo(() => new RegExp(escapeRegExp(filter()), "i"));

  type PendingRecipeList = {
    needRecipes: Accessor<boolean>;
    setNeedRecipes: Setter<boolean>;
    recipes: Resource<RecipeTitleWithLinkFields[]>;
  };

  const recipesByCategory = createMemo(() => {
    return new Map<number, PendingRecipeList>(
      props.categories.map((category) => {
        const [needRecipes, setNeedRecipes] = createSignal(false);
        const [recipes] = createResource(needRecipes, () =>
          actions.recipesInCategory.orThrow({ categoryIds: [category.id] })
        );
        return [category.id, { needRecipes, setNeedRecipes, recipes }];
      })
    );
  });

  const filteredCategories = createMemo(() =>
    filterListWithInitialMatchesFirst(
      props.categories,
      filterRE(),
      (c) => c.name
    )
  );

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

  return (
    <>
      <QueryDrivenTextField
        queryParam="filter"
        value={filter()}
        onInput={setFilter}
      >
        Filter
      </QueryDrivenTextField>
      <section id="categories">
        <ul class="details">
          <For each={filteredCategories()}>
            {(category) => (
              <li>
                <details
                  open={filteredCategories().length === 1}
                  onToggle={[onToggleCategory, category.id]}
                >
                  <summary>{category.name}</summary>
                  <Suspense fallback={<p>Loading...</p>}>
                    <ul>
                      <For
                        each={recipesByCategory().get(category.id)?.recipes()}
                      >
                        {(recipe) => (
                          <li>
                            <OneRecipe recipe={recipe} />
                          </li>
                        )}
                      </For>
                    </ul>
                  </Suspense>
                </details>
              </li>
            )}
          </For>
        </ul>
      </section>
    </>
  );
};
