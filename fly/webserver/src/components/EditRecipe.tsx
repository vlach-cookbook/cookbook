import type { Recipe, RecipeIngredient, User } from '@prisma/client';
import { Component, createSignal, createUniqueId, For, Index } from 'solid-js';
import { createStore, produce } from "solid-js/store";

import { GrowingTextarea } from './GrowingTextarea';

type RecipeWithIngredients = (Recipe & {
  ingredients: RecipeIngredient[];
});

const IngredientsEditor: Component<{ ingredients: RecipeIngredient[] }> = (props) => {
  const [ingredients, setIngredients] = createStore(props.ingredients);
  let fields: HTMLFieldSetElement | undefined;

  return <fieldset ref={fields}>
    <legend><h3>Ingredients</h3></legend>
    <ul>
      <Index each={ingredients}>
        {(ingredient, index) => (
          <li draggable={true} style={{ cursor: "move" }}>
            <input type="hidden" name={`ingredient.${index}.id`} value={ingredient().id} />
            <input type="text"
              name={`ingredient.${index}.amount`} value={ingredient().amount || ""}
              placeholder="Amount" style={{ width: "5em" }} />
            <input type="text"
              name={`ingredient.${index}.unit`} value={ingredient().unit || ""}
              placeholder="Unit" style={{ width: "3em" }} />
            <input type="text"
              name={`ingredient.${index}.ingredient`} value={ingredient().ingredient}
              placeholder="Ingredient" style={{ width: "10em" }} />
            <input type="text"
              name={`ingredient.${index}.preparation`} value={ingredient().preparation || ""}
              placeholder="Preparation" style={{ width: "10em" }} />
          </li>
        )
        }
      </Index>
    </ul>
  </fieldset>;
}

const InstructionsEditor: Component<{ steps: string[] }> = (props) => {
  const [steps, setSteps] = createStore(props.steps.map(step => ({ id: createUniqueId(), step })));
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
  function onStepKeyDown(stepIndex: number, event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
    // Don't interfere with composition sessions.
    if (event.isComposing) return;

    // TODO: Make this undoable.
    const textArea = event.currentTarget;

    if (event.key === "Backspace") {
      if (textArea.selectionStart === 0 && textArea.selectionEnd === 0) {
        mergeSteps(stepIndex - 1);
        event.preventDefault();
      }
    } else if (event.key === "Delete") {
      if (textArea.selectionStart === textArea.selectionEnd && textArea.selectionStart === textArea.value.length) {
        mergeSteps(stepIndex);
        event.preventDefault();
      }
    } else if (event.key === "Enter" && !event.shiftKey) {
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
  const [draggedStepId, setDraggedStepId] = createSignal<string | null>(null);

  function onDragStart(index: number, event: DragEvent & { currentTarget: HTMLLIElement }) {
    setStepsBeforeDrag(steps.slice());
    const step = steps[index];
    if (!step) {
      console.trace(`Step index ${index} out of bounds.`);
      return;
    }
    // Drag data "protected" mode (https://html.spec.whatwg.org/multipage/dnd.html#concept-dnd-p)
    // hides the step ID until the "drop" event, but we want to use it before that.
    setDraggedStepId(step.id);
    event.dataTransfer!.setData(DRAG_MIMETYPE, step.id);
    event.dataTransfer!.setData("text/plain", step.step);
    event.dataTransfer!.effectAllowed = "copyMove";
    event.currentTarget.classList.add("dragging");
  }

  function onDragEnd(event: DragEvent & { currentTarget: HTMLLIElement }) {
    event.currentTarget.classList.remove("dragging");
    const oldSteps = stepsBeforeDrag();
    if (event.dataTransfer?.dropEffect === "none" && oldSteps) {
      // Undo the drag if it was cancelled.
      setSteps(oldSteps);
    }
    setStepsBeforeDrag(null);
    setDraggedStepId(null);
  }

  function onDragEnter(targetIndex: number, event: DragEvent & { currentTarget: HTMLLIElement }) {
    if (event.dataTransfer!.types.includes(DRAG_MIMETYPE)) {
      event.dataTransfer!.dropEffect = "move";
      // Show what the list will look like with the dragged item moved here.
      const sourceId = draggedStepId();
      const sourceIndex = steps.findIndex(step => step.id === sourceId);
      if (sourceIndex === -1) {
        console.trace(`Lost the step being dragged, with ID ${sourceId}`);
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
    <ol>
      <For each={steps}>
        {(step, index) =>
          <li draggable={true}
            onDragStart={[onDragStart, index()]}
            onDragEnd={onDragEnd}
            onDragEnter={[onDragEnter, index()]}
            onDragOver={onDragOver}
          >
            <GrowingTextarea name={`step.${index()}`}
              onInput={e => { setSteps(index(), "step", e.currentTarget.value); }}
              onKeyDown={[onStepKeyDown, index()]}>{step.step}</GrowingTextarea>
          </li>
        }
      </For>
    </ol>
  </fieldset>;
}

export const EditRecipe: Component<{ recipe: RecipeWithIngredients, user: User }> = (props) => {
  return <form method="post" action={`/edit/${props.user.username}/${props.recipe.slug}/submit`}>
    <input type="hidden" name="id" value={props.recipe.id} />
    <div>
      <p><label>Recipe name:
        <input style={{ "font-size": "1.5em", "font-style": "bold", "margin-bottom": ".5em" }}
          type="text" name="title" value={props.recipe.name}></input></label></p>
      {props.recipe.servings ? <p>{props.recipe.servings} Servings</p> : null}
      <IngredientsEditor ingredients={props.recipe.ingredients}></IngredientsEditor>
      <InstructionsEditor steps={props.recipe.steps}></InstructionsEditor>
      <nav id="options" class="noprint">
        <button type="submit">Save</button>
      </nav>
    </div>
  </form>;
}
