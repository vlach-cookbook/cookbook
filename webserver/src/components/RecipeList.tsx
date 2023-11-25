import { escapeRegExp, filterListWithInitialMatchesFirst } from '@lib/util';
import { type Component, createMemo, createSignal, For } from 'solid-js';
import { OneRecipe, type RecipeTitleWithLinkFields } from './OneRecipe';
import { QueryDrivenTextField } from './QueryDrivenTextField';


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
