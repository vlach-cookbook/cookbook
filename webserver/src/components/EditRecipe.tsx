import slugify from '@lib/slugify';
import type { Category, Recipe, RecipeIngredient as DBRecipeIngredient, User } from '@prisma/client';
import { batch, Component, createSignal, createUniqueId, For } from 'solid-js';
import { createStore, produce, unwrap } from "solid-js/store";

import { GrowingTextarea } from './GrowingTextarea';

type RecipeIngredient = Omit<DBRecipeIngredient, 'id' | 'recipeId' | 'order'> & { id?: number | undefined };

type RecipeWithIngredients = (Recipe & {
  ingredients: RecipeIngredient[];
  categories: Category[];
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
  ingredientsDatalistId: string
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
        ingredients.splice(index + 1, 0, { id: undefined, amount: null, unit: null, name: '', preparation: null });
      }));
      // Focus the first field of the new line, after its nodes are created.
      queueMicrotask(() => {
        focusIngredientField(index + 1, nameComponents[2]!);
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
            {ingredient.id ?
              <input type="hidden" name={`ingredient.${index()}.id`} value={ingredient.id} />
              : null}
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
const InstructionsEditor: Component<{ steps: string[] }> = (props) => {
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

const CategoriesEditor: Component<{ categories: Category[], categoriesDatalistId: string }> = (props) => {
  const [categories, setCategories] = createStore(
    props.categories.length === 0 ?
      [{ name: "" }]
      : props.categories.map(c => ({ name: c.name })));
  let fields: HTMLFieldSetElement | undefined;

  function onKeyDown(category: { name: string }, event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    // Don't interfere with composition sessions.
    if (event.isComposing) return;

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

export const EditRecipe: Component<{
  recipe?: RecipeWithIngredients,
  user: User,
  categoriesDatalistId: string,
  unitsDatalistId: string,
  ingredientsDatalistId: string
}> = (props) => {
  const [slug, setSlug] = createSignal(props.recipe?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = createSignal(!!props.recipe?.id);
  let nameInput: HTMLInputElement | undefined;

  function onNameInput(event: Event & { currentTarget: HTMLInputElement }) {
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

  return <form method="post" action={`/edit/${props.user.username}/${slug()}/submit`}>
    {props.recipe ? <input type="hidden" name="id" value={props.recipe.id} /> : null}
    <div>
      <p><label>Recipe name:
        <input style={{ "font-size": "1.5em", "font-style": "bold", "margin-bottom": ".5em" }}
          autocapitalize="words"
          type="text" name="name" value={props.recipe?.name || ""}
          ref={nameInput} onInput={onNameInput} /></label></p>
      {props.recipe ? null : <p>
        <label>Recipe URL: <code>/r/{props.user.username}/{slugManuallyEdited() ?
          <input
            type="text" name="slug" value={slug()} onInput={onSlugInput}
          /> : slug()}</code></label>
        {slugManuallyEdited() ?
          <button type="button" title="Reset URL to default." onClick={resetSlug}>🔄</button>
          : <button type="button" title="Edit URL." onClick={() => setSlugManuallyEdited(true)}>✏️</button>}
      </p>}
      <p><label><input type="number" name="servings" value={props.recipe?.servings || ""}></input> Servings</label></p>
      <IngredientsEditor ingredients={props.recipe?.ingredients || []}
        unitsDatalistId={props.unitsDatalistId}
        ingredientsDatalistId={props.ingredientsDatalistId} />
      <InstructionsEditor steps={props.recipe?.steps || []} />
      <CategoriesEditor categories={props.recipe?.categories || []}
        categoriesDatalistId={props.categoriesDatalistId} />
      <nav id="options" class="noprint">
        <button type="submit">Save</button>
      </nav>
    </div>
  </form>;
}
