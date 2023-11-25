import { type FlowComponent, onCleanup, onMount } from "solid-js";

export const QueryDrivenTextField: FlowComponent<{
  queryParam: string,
  value: string,
  onInput: (value: string) => void,
}> = (props)=> {
  function onFieldInput(event: InputEvent & { currentTarget: HTMLInputElement }) {
    const newValue = event.currentTarget.value;
    props.onInput(newValue);
    const url = new URL(location.href);
    if (newValue) {
      url.searchParams.set(props.queryParam, newValue);
    } else {
      url.searchParams.delete(props.queryParam);
    }
    // Keep the original URL in the history, but treat "searching" as a single state.
    if (!history.state) {
      history.pushState(true, "", url);
    } else {
      history.replaceState(true, "", url);
    }
  }

  function onSubmit(e: Event) {
    // If the user presses 'enter', instead of reloading the page, just add a history entry.
    history.pushState(true, "", location.href);
    e.preventDefault();
  }

  onMount(() => {
    function listener() {
      props.onInput(new URLSearchParams(location.search).get(props.queryParam) ?? "");
    }
    window.addEventListener("popstate", listener);
    onCleanup(() => window.removeEventListener("popstate", listener));
  });

  return <form onSubmit={onSubmit}>
    <label>{props.children} <input type="search" name="filter" value={props.value}
      onInput={onFieldInput} autofocus /></label>
  </form>;
}
