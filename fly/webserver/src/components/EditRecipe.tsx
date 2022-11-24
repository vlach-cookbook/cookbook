import type { Recipe, RecipeIngredient, User } from '@prisma/client';
import { Component, Index } from 'solid-js';
import { createStore } from "solid-js/store";

import { GrowingTextarea } from './GrowingTextarea';

type RecipeWithIngredients = (Recipe & {
  ingredients: RecipeIngredient[];
});

/// Concatenates two elements in an array,
function mergeStringsInArray(array: string[], indexToMergeWithNext: number): string[] {
  if (indexToMergeWithNext < 0 || indexToMergeWithNext + 1 >= array.length) {
    return array;
  }
  return [
    ...array.slice(0, indexToMergeWithNext),
    array[indexToMergeWithNext]! + array[indexToMergeWithNext + 1]!,
    ...array.slice(indexToMergeWithNext + 2)];
}

export const EditRecipe: Component<{ recipe: RecipeWithIngredients, user: User }> = (props) => {
  const [recipe, setRecipe] = createStore(props.recipe);
  let theForm: HTMLFormElement | undefined;

  function beforeStepInput(stepIndex: number, event: InputEvent & { currentTarget: HTMLTextAreaElement }) {
    console.debug("beforeStepInput(", stepIndex, event.currentTarget, event.inputType, event.data, ")");
    // TODO: Make this undoable.
    const textArea = event.currentTarget;
    if (event.inputType === "deleteContentBackward") {
      if (textArea.selectionStart === 0 && textArea.selectionEnd === 0) {
        // Merge this step with the previous one.
        const offset = recipe.steps[stepIndex - 1]!.length;
        setRecipe("steps", mergeStringsInArray(recipe.steps, stepIndex - 1));
        queueMicrotask(() => {
          const focusedTextArea = theForm?.elements.namedItem(`step.${stepIndex - 1}`) as HTMLTextAreaElement | null;
          focusedTextArea?.focus();
          focusedTextArea?.setSelectionRange(offset, offset);
        });
        event.preventDefault();
      }
    } else if (event.inputType === "deleteContentForward") {
      if (textArea.selectionStart === textArea.selectionEnd && textArea.selectionStart === textArea.value.length) {
        // Merge this step with the next one.
        const offset = recipe.steps[stepIndex]!.length;
        setRecipe("steps", mergeStringsInArray(recipe.steps, stepIndex));
        queueMicrotask(() => {
          const focusedTextArea = theForm?.elements.namedItem(`step.${stepIndex}`) as HTMLTextAreaElement | null;
          focusedTextArea?.focus();
          focusedTextArea?.setSelectionRange(offset, offset);
        });
        event.preventDefault();
      }
    } else if (event.inputType === "insertLineBreak" ||
      event.inputType === "insertParagraphBreak") {
      console.debug(textArea.selectionStart, textArea.selectionEnd);
      const offset = textArea.selectionStart;
      setRecipe("steps", [
        ...recipe.steps.slice(0, stepIndex),
        recipe.steps[stepIndex]!.slice(0, textArea.selectionStart),
        recipe.steps[stepIndex]!.slice(textArea.selectionEnd),
        ...recipe.steps.slice(stepIndex + 1)]);
      queueMicrotask(() => {
        const focusedTextArea = theForm?.elements.namedItem(`step.${stepIndex + 1}`) as HTMLTextAreaElement | null;
        focusedTextArea?.focus();
        focusedTextArea?.setSelectionRange(0, 0);
      });
      event.preventDefault();
    }
  };

  return <form ref={theForm} method="post" action={`/edit/${props.user.username}/${recipe.slug}/submit`}>
    <input type="hidden" name="id" value={recipe.id} />
    <div>
      <p><label>Recipe name:
        <input style={{ "font-size": "1.5em", "font-style": "bold", "margin-bottom": ".5em" }}
          type="text" name="title" value={recipe.name}></input></label></p>
      {recipe.servings ? <p>{recipe.servings} Servings</p> : null}
      <fieldset>
        <legend><h3>Ingredients</h3></legend>
        <ul>
          <Index each={recipe.ingredients}>
            {(ingredient, index) => (
              <li>
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
      </fieldset>
      <fieldset>
        <legend><h3>Instructions</h3></legend>
        <ol>
          <Index each={recipe.steps}>
            {(step, index) =>
              <li>
                <GrowingTextarea name={`step.${index}`}
                  onInput={e => { setRecipe("steps", index, e.currentTarget.value); }}
                  onBeforeInput={[beforeStepInput, index]}>{step()}</GrowingTextarea>
              </li>
            }
          </Index>
        </ol>
      </fieldset>
      <nav id="options" class="noprint">
        <button type="submit">Save</button>
      </nav>
    </div>
  </form >;
}
