import { Temporal } from "@js-temporal/polyfill";
import { escapeRegExp } from "@lib/util";
import { actions } from "astro:actions";
import {
  For,
  Suspense,
  createMemo,
  createResource,
  createSignal,
  onMount,
  type Accessor,
  type Component,
  type Resource,
  type Setter,
} from "solid-js";
import { OneRecipe, type RecipeTitleWithLinkFields } from "./OneRecipe";
import { QueryDrivenTextField } from "./QueryDrivenTextField";

function formatMonth(m: Temporal.PlainYearMonth) {
  return m.toLocaleString(undefined, {
    calendar: m.calendarId,
    year: "numeric",
    month: "short",
  });
}

export const HistoryList: Component<{
  /** In ISO YYYY-MM format. */
  months: string[];
  initialQuery: string;
}> = (props) => {
  // Keeping the search filter updated:
  const [filter, setFilter] = createSignal(
    new URLSearchParams(props.initialQuery).get("filter") ?? ""
  );

  // Search for months:

  const filterRE = createMemo(
    () =>
      new RegExp(filter().trim().split(/\b/).map(escapeRegExp).join(".*"), "i")
  );

  type PendingRecipeList = {
    needRecipes: Accessor<boolean>;
    setNeedRecipes: Setter<boolean>;
    recipes: Resource<RecipeTitleWithLinkFields[]>;
  };

  const recipesByHistory = createMemo(() => {
    return new Map<string, PendingRecipeList>(
      props.months.map((month) => {
        const [needRecipes, setNeedRecipes] = createSignal(false);
        const [recipes] = createResource(needRecipes, () =>
          actions.recipesInMonth.orThrow([month])
        );
        return [month, { needRecipes, setNeedRecipes, recipes }];
      })
    );
  });

  const filteredMonths = createMemo(() => {
    const months = props.months.map((m) => Temporal.PlainYearMonth.from(m));
    months.sort(Temporal.PlainYearMonth.compare);
    months.reverse();
    return months.filter((m) => filterRE().test(formatMonth(m)));
  });

  function onToggleMonth(month: string) {
    recipesByHistory().get(month)?.setNeedRecipes(true);
  }

  onMount(() => {
    // Ensure default-open months load their recipes.
    const initialMonths = filteredMonths();
    if (initialMonths.length === 1) {
      recipesByHistory()
        .get(initialMonths[0]!.toString())
        ?.setNeedRecipes(true);
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
      <section id="history">
        <ul class="details">
          <For each={filteredMonths()}>
            {(month) => (
              <li>
                <details
                  open={filteredMonths().length === 1}
                  onToggle={[onToggleMonth, month.toString()]}
                >
                  <summary>{formatMonth(month)}</summary>
                  <Suspense fallback={<p>Loading...</p>}>
                    <ul>
                      <For
                        each={recipesByHistory()
                          .get(month.toString())
                          ?.recipes()}
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
