import type { FlowComponent, JSX } from "solid-js";
import styles from "./GrowingTextarea.module.css";

/// Using the technique from https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/.
export const GrowingTextarea: FlowComponent<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, string> = (props) => {
  function handleInput(event: InputEvent & { target: Element }) {
    if (event.target instanceof HTMLTextAreaElement) {
      event.target.parentElement!.dataset.replicatedValue = event.target.value
    }
  }

  return (
    <div class={styles.wrapper} data-replicated-value={props.children} onInput={handleInput} >
      <textarea {...props} value={props.children}></textarea>
    </div>
  );
};
