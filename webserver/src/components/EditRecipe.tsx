import slugify from '@lib/slugify';
import { type Category, type Recipe, type RecipeIngredient as DBRecipeIngredient, type User, type RecipeSource as DBRecipeSource, SourceType, type DraftRecipe } from '@prisma/client';
import { batch, type Component, createSignal, createUniqueId, For, createReaction, Match, Switch } from 'solid-js';
import { createStore, produce, unwrap } from "solid-js/store";

import { GrowingTextarea } from './GrowingTextarea';
import { JsonRecipe } from '@lib/json-recipe';
import { parseIntOrUndefined } from '@lib/forms';

type RecipeSource = Omit<DBRecipeSource, 'id' | 'recipeId'> & { id?: number };
type RecipeIngredient = Omit<DBRecipeIngredient, 'recipeId' | 'order'>;

type RecipeWithIngredients = (Recipe & {
  sources: RecipeSource[];
  ingredients: RecipeIngredient[];
  categories: Omit<Category, "id">[];
});

function ingredientToString(ingredient: RecipeIngredient): string {
  let result = [ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean).join(' ');
  if (ingredient.preparation) {
    result += `, ${ingredient.preparation}`;
  }
  return result;
}

function emptyIngredient(): RecipeIngredient {
  return { amount: "", unit: "", name: "", preparation: "" };
}

const IngredientsEditor: Component<{
  ingredients: RecipeIngredient[],
  unitsDatalistId: string,
  ingredientsDatalistId: string,
  setDirty: () => void,
}> = (props) => {
  const [ingredients, setIngredients] = createStore<RecipeIngredient[]>(props.ingredients.length === 0 ?
    [emptyIngredient()]
    : props.ingredients);
  let fields: HTMLFieldSetElement | undefined;

  function removeIngredient(ingredient: RecipeIngredient) {
    if (ingredients.length === 1) {
      setIngredients(0, emptyIngredient())
    }
    else {
      setIngredients(ingredients.filter(i => i !== ingredient));
    }
  }

  // Keyboard shortcuts for editing, including arrow-navigation and insertion of new ingredients.
  /// Splits or merges steps depending on the user's keypress.
  function onIngredientKeyDown(event: KeyboardEvent & { target: Element }) {
    // Don't interfere with composition sessions.
    if (event.isComposing) return;

    // Only deal with keystrokes on the ingredient inputs.
    if (!(event.target instanceof HTMLInputElement)) return;

    props.setDirty();

    const inputElem = event.target;
    const nameComponents = inputElem.name.split('.');
    const index = Number.parseInt(nameComponents[1]!, 10);
    const field = nameComponents[2];
    if (!field || !["amount", "unit", "name", "preparation"].includes(field)) {
      console.trace("Unexpected field name", field);
      return;
    }

    function focusIngredientField(index: number, field: string) {
      const elemName = `ingredient.${index}.${field}`
      const targetInput = fields?.elements.namedItem(elemName);
      if (!targetInput || !(targetInput instanceof HTMLInputElement)) {
        console.trace(`Couldn't find new element; should be ${elemName} in fieldset`, fields);
        return;
      }
      targetInput.focus();
    }

    if (event.key === "ArrowUp") {
      if (index > 0) {
        focusIngredientField(index - 1, field);
        event.preventDefault();
      }
    } else if (event.key === "ArrowDown") {
      if (index + 1 < ingredients.length) {
        focusIngredientField(index + 1, field);
        event.preventDefault();
      }
    } else if (event.key === "Enter" && !event.shiftKey) {
      setIngredients(produce(ingredients => {
        ingredients.splice(index + 1, 0, { amount: null, unit: null, name: '', preparation: null });
      }));
      // Focus the first field of the new line, after its nodes are created.
      queueMicrotask(() => {
        focusIngredientField(index + 1, "amount");
      });
      event.preventDefault();
    }
  };

  // Drag & Drop

  const DRAG_MIMETYPE = "application/x-cookbook-ingredient-drag-id";

  /// Used to undo the drag & drop operation if the drop is cancelled.
  const [ingredientsBeforeDrag, setIngredientsBeforeDrag] = createSignal<typeof ingredients | null>(null);
  /// Which ingredient is being dragged.
  const [draggedIngredient, setDraggedIngredient] = createSignal<RecipeIngredient | null>(null);

  function onDragStart(ingredient: RecipeIngredient, event: DragEvent & { currentTarget: HTMLLIElement }) {
    setIngredientsBeforeDrag(ingredients.slice());
    // We can't send the app-local data through dataTransfer.setData because drag data "protected"
    // mode (https://html.spec.whatwg.org/multipage/dnd.html#concept-dnd-p) hides that value until
    // the "drop" event, but we want to use it before that.
    setDraggedIngredient(ingredient);
    event.dataTransfer!.setData(DRAG_MIMETYPE, "");
    event.dataTransfer!.setData("text/plain", ingredientToString(ingredient));
    event.dataTransfer!.effectAllowed = "copyMove";
    event.currentTarget.classList.add("dragging");
  }

  function onDragEnd(event: DragEvent & { currentTarget: HTMLLIElement }) {
    event.currentTarget.classList.remove("dragging");
    const oldIngredients = ingredientsBeforeDrag();
    if (oldIngredients) {
      // Undo the drag if it was cancelled.
      setIngredients(oldIngredients);
    }
    setIngredientsBeforeDrag(null);
    setDraggedIngredient(null);
  }

  function onDrop(event: DragEvent & { currentTarget: HTMLLIElement }) {
    setIngredientsBeforeDrag(null);
    event.preventDefault();
  }

  function onDragEnter(targetIngredient: RecipeIngredient, event: DragEvent & { currentTarget: HTMLLIElement }) {
    if (event.dataTransfer!.types.includes(DRAG_MIMETYPE)) {
      event.dataTransfer!.dropEffect = "move";
      // Show what the list will look like with the dragged item moved here.
      const source = draggedIngredient();
      const sourceIndex = ingredients.findIndex(ingredient => ingredient === source);
      const targetIndex = ingredients.findIndex(ingredient => ingredient === targetIngredient);
      if (sourceIndex === -1) {
        console.trace("Lost the step being dragged,", source);
        return;
      }
      if (sourceIndex === targetIndex) return;
      setIngredients(produce(ingredients => {
        const sourceIngredient = ingredients.splice(sourceIndex, 1);
        // Moving backward should land one before the target, and moving forward should land one
        // after. This splice works either way because splicing out the source shifts a later target
        // one earlier so that the insertion splice lands after it.
        ingredients.splice(targetIndex, 0, ...sourceIngredient);
      }));
      event.preventDefault();
    }
  }
  function onDragOver(event: DragEvent & { currentTarget: HTMLLIElement }) {
    if (event.dataTransfer!.types.includes(DRAG_MIMETYPE)) {
      event.preventDefault();
    }
  }

  // Draggable input elements disable selection within the element, so disable draggability on focus
  // and re-enable it on blur.
  const [draggableDisabled, setDraggableDisabled] = createSignal<HTMLElement[]>([]);
  function disableDraggable(event: FocusEvent & { currentTarget: HTMLElement }) {
    let elemsDisabled: HTMLElement[] = [];

    for (let elem: HTMLElement | null = event.currentTarget; elem; elem = elem.parentElement) {
      if (elem.draggable) {
        elemsDisabled.push(elem);
        elem.draggable = false;
      }
    }
    setDraggableDisabled(elemsDisabled);
  }
  function enableDraggable() {
    for (let elem of draggableDisabled()) {
      elem.draggable = true;
    }
    setDraggableDisabled([]);
  }

  return <fieldset ref={fields}>
    <legend><h3>Ingredients</h3></legend>
    <ul>
      <For each={ingredients}>
        {(ingredient, index) => (
          <li draggable={true} style={{ cursor: "move" }}
            onDragStart={[onDragStart, ingredient]}
            onDragEnd={onDragEnd}
            onDragEnter={[onDragEnter, ingredient]}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onKeyDown={onIngredientKeyDown}
          >
            <input type="text"
              name={`ingredient.${index()}.amount`} value={ingredient.amount || ""}
              onInput={event => setIngredients(i => i === unwrap(ingredient), "amount", event.currentTarget.value)}
              placeholder="Amount" style={{ width: "3em" }}
              onFocus={disableDraggable} onBlur={enableDraggable} />
            <input type="text"
              name={`ingredient.${index()}.unit`} value={ingredient.unit || ""}
              list={props.unitsDatalistId}
              onInput={event => setIngredients(i => i === unwrap(ingredient), "unit", event.currentTarget.value)}
              placeholder="Unit" style={{ width: "3em" }}
              onFocus={disableDraggable} onBlur={enableDraggable} />
            <input type="text"
              name={`ingredient.${index()}.name`} value={ingredient.name}
              list={props.ingredientsDatalistId}
              onInput={event => setIngredients(i => i === unwrap(ingredient), "name", event.currentTarget.value)}
              placeholder="Ingredient" style={{ width: "10em" }}
              onFocus={disableDraggable} onBlur={enableDraggable} />
            <input type="text"
              name={`ingredient.${index()}.preparation`} value={ingredient.preparation || ""}
              onInput={event => setIngredients(i => i === unwrap(ingredient), "preparation", event.currentTarget.value)}
              placeholder="Preparation" style={{ width: "10em" }}
              onFocus={disableDraggable} onBlur={enableDraggable} />
            <button type="button" title="Remove this ingredient"
              onClick={[removeIngredient, ingredient]}
              classList={{
                "hidden": ingredients.length === 1
                  && !ingredient.amount && !ingredient.unit
                  && !ingredient.name && !ingredient.preparation
              }}
            >🗑️</button>
          </li>
        )
        }
      </For>
    </ul>
  </fieldset>;
}

type StepObj = {
  step: string;
};
const InstructionsEditor: Component<{ steps: string[], setDirty: () => void }> = (props) => {
  const [steps, setSteps] = createStore(props.steps.length === 0
    ? [{ step: "" }]
    : props.steps.map(step => ({ step })));
  let fields: HTMLFieldSetElement | undefined;

  // Keyboard shortcuts to merge and split steps.

  /// Merges steps[firstIndex] with steps[firstIndex + 1].
  function mergeSteps(firstIndex: number) {
    if (firstIndex < 0 || firstIndex + 1 >= steps.length) {
      console.trace(`Step index ${firstIndex} out of bounds.`);
      return;
    }
    let offset: number;
    setSteps(produce(steps => {
      // Keep object identity consistent, so DOM elements aren't unnecessarily recreated.
      const adjustedStep = steps[firstIndex]!;
      offset = adjustedStep.step.length;
      adjustedStep.step += steps[firstIndex + 1]!.step;
      // Delete the step that's been merged into its predecessor.
      steps.splice(firstIndex + 1, 1);
    }));
    // After the new form elements are created, ensure the cursor stays where it was.
    delayedPutCursorAt(firstIndex, offset!);
  }

  /// Waits until new DOM elements have been created, and then focuses the element for
  /// steps[stepIndex] and puts the cursor at offset.
  function delayedPutCursorAt(stepIndex: number, offset: number) {
    queueMicrotask(() => {
      const targetTextArea = fields?.elements.namedItem(`step.${stepIndex}`);
      if (!targetTextArea || !(targetTextArea instanceof HTMLTextAreaElement)) {
        console.trace(`Couldn't find target text area; should be step.${stepIndex} in fieldset`, fields);
        return;
      }
      targetTextArea.focus();
      targetTextArea.setSelectionRange(offset, offset);
    });
  }

  /// Splits or merges steps depending on the user's keypress.
  function onStepKeyDown(step: StepObj, event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
    // Don't interfere with composition sessions.
    if (event.isComposing) return;

    props.setDirty();

    // TODO: Make this undoable.
    const textArea = event.currentTarget;

    const stepIndex = steps.indexOf(step);

    if (event.key === "Backspace") {
      if (textArea.selectionStart === 0
        && textArea.selectionEnd === 0
        && stepIndex > 0) {
        mergeSteps(stepIndex - 1);
        event.preventDefault();
      }
    } else if (event.key === "Delete") {
      if (textArea.selectionStart === textArea.selectionEnd
        && textArea.selectionStart === textArea.value.length
        && stepIndex + 1 < steps.length) {
        mergeSteps(stepIndex);
        event.preventDefault();
      }
    } else if (event.key === "Enter" && event.shiftKey) {
      setSteps(produce(steps => {
        const adjustedStep = steps[stepIndex]!;
        const newStep = { id: createUniqueId(), step: adjustedStep.step.slice(textArea.selectionEnd) }
        adjustedStep.step = adjustedStep.step.slice(0, textArea.selectionStart);
        steps.splice(stepIndex + 1, 0, newStep);
      }));
      delayedPutCursorAt(stepIndex + 1, 0);
      event.preventDefault();
    }
  };

  // Drag & Drop

  const DRAG_MIMETYPE = "application/x-cookbook-instruction-drag-id";

  /// Used to undo the drag & drop operation if the drop is cancelled.
  const [stepsBeforeDrag, setStepsBeforeDrag] = createSignal<typeof steps | null>(null);
  /// Which step is being dragged.
  const [draggedStep, setDraggedStep] = createSignal<StepObj | null>(null);

  function onDragStart(step: StepObj, event: DragEvent & { currentTarget: HTMLLIElement }) {
    setStepsBeforeDrag(steps.slice());
    // Drag data "protected" mode (https://html.spec.whatwg.org/multipage/dnd.html#concept-dnd-p)
    // hides the step ID until the "drop" event, but we want to use it before that.
    setDraggedStep(step);
    event.dataTransfer!.setData(DRAG_MIMETYPE, "");
    event.dataTransfer!.setData("text/plain", step.step);
    event.dataTransfer!.effectAllowed = "copyMove";
    event.currentTarget.classList.add("dragging");
  }

  function onDragEnd(event: DragEvent & { currentTarget: HTMLLIElement }) {
    event.currentTarget.classList.remove("dragging");
    const oldSteps = stepsBeforeDrag();
    if (oldSteps) {
      // Undo the drag if it wasn't dropped in this list.
      setSteps(oldSteps);
    }
    setStepsBeforeDrag(null);
    setDraggedStep(null);
  }

  function onDrop(event: DragEvent & { currentTarget: HTMLLIElement }) {
    // Commit the move.
    setStepsBeforeDrag(null);
    event.preventDefault();
  }

  function onDragEnter(targetStep: StepObj, event: DragEvent & { currentTarget: HTMLLIElement }) {
    if (event.dataTransfer!.types.includes(DRAG_MIMETYPE)) {
      event.dataTransfer!.dropEffect = "move";
      // Show what the list will look like with the dragged item moved here.
      const source = draggedStep();
      const sourceIndex = steps.findIndex(step => step === source);
      const targetIndex = steps.findIndex(step => step === targetStep);
      if (sourceIndex === -1) {
        console.trace(`Lost the step being dragged, ${source}`);
        return;
      }
      if (sourceIndex === targetIndex) return;
      setSteps(produce(steps => {
        const sourceStep = steps.splice(sourceIndex, 1);
        // This works whether we're moving forward or backward because splicing out the source
        // shifts a later target one earlier so that the insertion splice lands after it.
        steps.splice(targetIndex, 0, ...sourceStep);
      }));
      event.preventDefault();
    }
  }
  function onDragOver(event: DragEvent & { currentTarget: HTMLLIElement }) {
    if (event.dataTransfer!.types.includes(DRAG_MIMETYPE)) {
      event.preventDefault();
    }
  }

  return <fieldset ref={fields}>
    <legend><h3>Instructions</h3></legend>
    {steps.length === 1 ?
      <GrowingTextarea name={`step.0`}
        onInput={e => setSteps(0, "step", e.currentTarget.value)}
        onKeyDown={[onStepKeyDown, steps[0]]}>{steps[0]!.step}</GrowingTextarea>
      :
      <ol>
        <For each={steps}>
          {(step, index) =>
            <li draggable={true} style={{ cursor: "move" }}
              onDragStart={[onDragStart, step]}
              onDragEnd={onDragEnd}
              onDragEnter={[onDragEnter, step]}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <GrowingTextarea name={`step.${index()}`} draggable={false}
                onInput={e => setSteps(s => s === unwrap(step), "step", e.currentTarget.value)}
                onKeyDown={[onStepKeyDown, step]}>{step.step}</GrowingTextarea>
            </li>
          }
        </For>
      </ol>
    }
  </fieldset>;
}

const CategoriesEditor: Component<{ categories: Omit<Category, "id">[], categoriesDatalistId: string, setDirty: () => void }> = (props) => {
  const [categories, setCategories] = createStore(
    props.categories.length === 0 ?
      [{ name: "" }]
      : props.categories.map(c => ({ name: c.name })));
  let fields: HTMLFieldSetElement | undefined;

  function onKeyDown(category: { name: string }, event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    // Don't interfere with composition sessions.
    if (event.isComposing) return;

    props.setDirty();

    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      const index = categories.findIndex(c => c === category);
      if (index === -1) {
        console.trace(`Lost the category being edited, ${category.name}`);
      }
      setCategories(produce(categories => { categories.splice(index + 1, 0, { name: "" }) }));
      queueMicrotask(() => {
        // Focus the new element after it's created.
        const newInput = fields?.elements.namedItem(`category.${index + 1}`);
        if (newInput instanceof HTMLInputElement) {
          newInput.focus();
        } else {
          console.trace(`Couldn't find new element; should be category ${index + 1} in fieldset`, fields);
        }
      });
      event.preventDefault();
    }
  }

  function removeCategory(category: { name: string }) {
    props.setDirty();
    if (categories.length === 1) {
      setCategories(0, "name", "");
    } else {
      setCategories(categories.filter(c => c !== category));
    }
  }

  return <fieldset ref={fields}>
    <legend><h3>Categories</h3></legend>
    <ul>
      <For each={categories}>
        {(category, index) =>
          <li>
            <input name={`category.${index()}`} type="text"
              value={category.name}
              list={props.categoriesDatalistId}
              onInput={e => setCategories(c => c === unwrap(category), "name", e.currentTarget.value)}
              onKeyDown={[onKeyDown, category]} />
            <button type="button" title="Remove this category"
              onClick={[removeCategory, category]}
              classList={{ hidden: categories.length === 1 && !categories[0]?.name }}>🗑️</button>
          </li>
        }
      </For>
    </ul>
  </fieldset>;
}

const SourceEditor: Component<{ sources: RecipeSource[], setDirty: () => void }> = (props) => {
  const defaultSource = { type: "FROM_WEBPAGE", name: null, url: null } as const;
  const [sources, setSources] = createStore<RecipeSource[]>(props.sources);

  const dirtyOn = createReaction(() => props.setDirty());
  dirtyOn(() => unwrap(sources));

  function typeIsPerson(type: SourceType) {
    return type === "BY_PERSON" || type === "BASED_ON_PERSON";
  }

  function appendSource() {
    setSources(sources.length, structuredClone(defaultSource));
  }

  function removeSource(source: RecipeSource) {
    setSources(sources.filter(i => i !== source));
  }

  return <fieldset>
    {sources.length === 0 ?
      <button type="button" onClick={appendSource}>
        Credit this recipe's authors.
      </button>
      :
      <>
        <legend><h3>Source</h3></legend>
        <ul>
          <For each={sources}>
            {(source, index) => (
              <li>
                {source.id ?
                  <input type="hidden" name={`source.${index()}.id`} value={source.id}></input>
                  : null}
                <select name={`source.${index()}.type`}
                  onInput={event => setSources(s => s === unwrap(source), "type", event.currentTarget.value as SourceType)}>
                  <option value={"BY_PERSON" satisfies SourceType} selected={source.type === "BY_PERSON"}>by</option>
                  <option value={"FROM_WEBPAGE" satisfies SourceType} selected={source.type === "FROM_WEBPAGE"}>from</option>
                  <option value={"BASED_ON_PERSON" satisfies SourceType} selected={source.type === "BASED_ON_PERSON"}>based on a recipe by</option>
                  <option value={"BASED_ON_WEBPAGE" satisfies SourceType} selected={source.type === "BASED_ON_WEBPAGE"}>based on</option>
                </select>
                <input name={`source.${index()}.name`} value={source.name ?? ""}
                  placeholder={typeIsPerson(source.type) ? "John Doe" : "Recipes R Us"}
                  onInput={event => setSources(s => s === unwrap(source), "name", event.currentTarget.value)} />
                <input name={`source.${index()}.url`} value={source.url ?? ""}
                  placeholder={typeIsPerson(source.type) ? "https://john.doe.name/" : "https://recipes.com/apple/fritters.html"}
                  onInput={event => setSources(s => s === unwrap(source), "url", event.currentTarget.value)} />
                <button type="button" title="Remove this source"
                  onClick={[removeSource, source]}
                >🗑️</button>
              </li>
            )}
          </For>
        </ul>
        <button type="button" onClick={appendSource}>
          Add another source for this recipe.
        </button>
      </>}
  </fieldset>;
};

export const EditRecipe: Component<{
  recipe?: RecipeWithIngredients,
  user: User,
  drafts?: DraftRecipe[],
  categoriesDatalistId: string,
  unitsDatalistId: string,
  ingredientsDatalistId: string
}> = (props) => {
  const drafts = (props.drafts ?? []).map(draft =>
    ({ draftId: draft.id, recipe: JsonRecipe.safeParse(draft.data) }))
    .flatMap(({ draftId, recipe }) => recipe.success ? Object.assign(recipe.data, { draftId }) : []);

  const draft = drafts[0];
  const recipe = draft === undefined ? props.recipe : {
    id: undefined,
    name: draft.name,
    slug: slugify(draft.name ?? ""),
    servings: parseIntOrUndefined(draft.recipeYield),
    steps: draft.recipeInstructions,
    sources: draft.sourceUrl ? [{ type: "FROM_WEBPAGE", name: null, url: draft.sourceUrl }] : [],
    ingredients: draft.recipeIngredient.map(({ quantity, unit, name, preparation }) =>
      ({ amount: quantity ?? null, unit: unit ?? null, name: name ?? "", preparation: preparation ?? null })),
    categories: draft.recipeCategory.map(category => ({ name: category })),
  } satisfies Partial<RecipeWithIngredients>;

  const [pristine, setPristine] = createSignal(!recipe?.id && !draft);
  const [slug, setSlug] = createSignal(recipe?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = createSignal(!!recipe?.id);
  let nameInput: HTMLInputElement | undefined;

  function setDirty() {
    setPristine(false);
  }

  // Reloads the page with the first draft set to the selected value. That'll
  // lead to the edit form being filled in with its values as defaults.
  //
  // TODO: Make the edit components react to changes in their properties so we
  // can do this without a reload.
  function selectDraft(event: Event & { currentTarget: HTMLSelectElement }) {
    const selectedDraftId = event.currentTarget.value;
    if (selectedDraftId === "") {
      return;
    }
    const otherDraftIds = drafts.map(draft => draft.draftId.toString()).filter(id => id !== selectedDraftId);
    location.search = `draft=${[selectedDraftId].concat(otherDraftIds).join(",")}`;
  }

  function onNameInput(event: Event & { currentTarget: HTMLInputElement }) {
    setDirty();
    if (!slugManuallyEdited()) {
      setSlug(slugify(event.currentTarget.value));
    }
  }

  function onSlugInput(event: Event & { currentTarget: HTMLInputElement }) {
    setSlug(event.currentTarget.value);
  }

  function resetSlug() {
    batch(() => {
      setSlugManuallyEdited(false);
      setSlug(slugify(nameInput?.value || ""));
    })
  }

  return <>
    <Switch>
      <Match when={pristine() && drafts.length > 1}>
        <select onchange={selectDraft}>
          <For each={drafts}>
            {(draft, index) => <option value={draft.draftId} selected={index() === 0}>{draft.name ?? "&lt;Untitled>"}</option>}
          </For>
        </select>
      </Match>
      <Match when={pristine()}>
        <form method="post" action="/import">
          <p><label>Import from: <input type="url" name="source" /></label> <button type="submit">Import</button></p>
        </form>
      </Match>
    </Switch>
    <form method="post" action={`/edit/${props.user.username}/${slug()}/submit`}>
      {recipe ? <input type="hidden" name="id" value={recipe.id} /> : null}
      {draft ? <input type="hidden" name="draftId" value={draft.draftId} /> : null}
      <div>
        <p><label>Recipe name:
          <input style={{ "font-size": "1.5em", "font-style": "bold", "margin-bottom": ".5em" }}
            autocapitalize="words"
            type="text" name="name" value={recipe?.name || ""}
            ref={nameInput} onInput={onNameInput} /></label></p>
        {recipe ? null : <p>
          <label>Recipe URL: <code>/r/{props.user.username}/{slugManuallyEdited() ?
            <input
              type="text" name="slug" value={slug()} onInput={onSlugInput}
            /> : slug()}</code></label>
          {slugManuallyEdited() ?
            <button type="button" title="Reset URL to default." onClick={resetSlug}>🔄</button>
            : <button type="button" title="Edit URL." onClick={() => setSlugManuallyEdited(true)}>✏️</button>}
        </p>}
        <p><label><input type="number" name="servings" value={recipe?.servings || ""}></input> Servings</label></p>
        <IngredientsEditor ingredients={recipe?.ingredients || []}
          unitsDatalistId={props.unitsDatalistId}
          ingredientsDatalistId={props.ingredientsDatalistId}
          setDirty={setDirty} />
        <InstructionsEditor steps={recipe?.steps || []} setDirty={setDirty} />
        <CategoriesEditor categories={recipe?.categories || []}
          categoriesDatalistId={props.categoriesDatalistId}
          setDirty={setDirty} />
        <SourceEditor sources={recipe?.sources ?? []}
          setDirty={setDirty} />
        <nav id="options" class="noprint">
          <button type="submit">Save</button>
        </nav>
      </div>
    </form>
  </>;
}
