import type { Category, RecipeIngredient, User } from "@prisma/client";
import { Component, For, Show } from "solid-js";
import { createStore, produce, SetStoreFunction, unwrap } from "solid-js/store";

export type ParsedRecipeSearch = {
  title: string | undefined;
  categoryFilter: {
    AND: Array<{
      OR: string[]
    }>
  };
  ingredientFilter: {
    AND: Array<{
      OR: string[]
    }>
  };
}

export function parseQuery(query: URLSearchParams): ParsedRecipeSearch {
  let title: string | undefined = undefined;
  const categoryFilter: ParsedRecipeSearch['categoryFilter'] = { AND: [] };
  const ingredientFilter: ParsedRecipeSearch['ingredientFilter'] = { AND: [] };
  for (const [key, value] of query.entries()) {
    if (key === "title") {
      title = value;
    }
    if (key.startsWith("category")) {
      let index = parseInt(key.slice("category".length));
      if (isNaN(index)) index = 0;
      if (!categoryFilter.AND[index]) {
        categoryFilter.AND[index] = { OR: [] };
      }
      categoryFilter.AND[index]!.OR.push(value);
    }
    if (key.startsWith("ingredient")) {
      let index = parseInt(key.slice("ingredient".length));
      if (isNaN(index)) index = 0;
      if (ingredientFilter.AND[index] == null) {
        ingredientFilter.AND[index] = { OR: [] };
      }
      ingredientFilter.AND[index]!.OR.push(value);
    }
  }

  return {
    title,
    categoryFilter: { AND: categoryFilter.AND.filter(Boolean) },
    ingredientFilter: { AND: ingredientFilter.AND.filter(Boolean) },
  }
}

export const SearchForm: Component<{
  allIngredients: Pick<RecipeIngredient, "name">[];
  allCategories: Pick<Category, "name">[];
  user: User | null;
  parsedQuery: ParsedRecipeSearch;
}> = (props) => {
  const [categoryGroups, setCategoryGroups] = createStore(props.parsedQuery.categoryFilter.AND.concat([{ OR: [] }]));
  const [ingredientGroups, setIngredientGroups] = createStore(props.parsedQuery.ingredientFilter.AND.concat([{ OR: [] }]));

  function onChange(event: Event & { currentTarget: HTMLSelectElement }) {
    const name = event.currentTarget.name;
    let setStore: SetStoreFunction<{ OR: string[]; }[]>;
    let index: number;
    if (name.startsWith("category")) {
      setStore = setCategoryGroups;
      index = parseInt(name.slice("category".length));
    } else if (name.startsWith("ingredient")) {
      setStore = setIngredientGroups;
      index = parseInt(name.slice("ingredient".length));
    } else {
      return;
    }

    const selected = Array.from(event.currentTarget.selectedOptions, (option) => option.value);
    setStore(produce(groups => {
      groups[index]!.OR = selected;
      console.log(unwrap(groups));
      function isEmpty(index: number) {
        return (groups[index]?.OR.length ?? 0) === 0;
      }
      if (!isEmpty(groups.length - 1)) {
        groups.push({ OR: [] });
      }
      let newLength = groups.length;
      while (newLength > 1 && isEmpty(newLength - 2)) {
        newLength--;
      }
      groups.length = newLength;
    }))
  }

  return <form method="get">
    <p>Find recipes with</p>
    <p><label>A title containing <input name="title" value={props.parsedQuery.title} /></label></p>
    <section class="andOrSelects">
      <For each={categoryGroups}>
        {(categoryGroup, index) =>
          <>
            <Show when={index() > 0}><p>AND</p></Show>
            <label><p>Any of these categories</p>
              <select multiple name={`category${index()}`} onChange={onChange}>
                <For each={props.allCategories}>{(category) =>
                  <option selected={categoryGroup.OR.includes(category.name)}>{category.name}</option>}
                </For>
              </select>
            </label>
          </>
        }
      </For>
    </section>
    <section class="andOrSelects">
      <For each={ingredientGroups}>
        {(ingredientGroup, index) =>
          <>
            <Show when={index() > 0}><p>AND</p></Show>
            <label><p>Any of these ingredients</p>
              <select multiple name={`ingredient${index()}`} onChange={onChange}>
                <For each={props.allIngredients}>{(ingredient) =>
                  <option selected={ingredientGroup.OR.includes(ingredient.name)}>{ingredient.name}</option>}
                </For>
              </select>
            </label>
          </>
        }
      </For>
    </section>
    <button type="submit">Search</button>
  </form>;
}
