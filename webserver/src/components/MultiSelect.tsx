import type SlSelect from "@shoelace-style/shoelace/dist/components/select/select.js";
import '@shoelace-style/shoelace/dist/themes/light.css';
import { type Component, For } from "solid-js";
import { isServer } from "solid-js/web";

if (!isServer) {
  import('@shoelace-style/shoelace/dist/components/select/select.js');
  import('@shoelace-style/shoelace/dist/components/option/option.js');
}

// Based on https://github.com/solidjs/solid/issues/616.
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'sl-select': HTMLAttributes<'sl-select'> & {
        multiple: boolean;
        clearable: boolean;
        value: string[];
        name: string;

      };
      'sl-option': HTMLAttributes<'sl-option'> & { value: string }
    }
  }
}

function ensureArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : value.split(' ');
}

export const MultiSelect: Component<{
  label: string;
  name: string;
  /// For compatibility with Shoelace, values can't contain spaces, and we convert "_" to space when
  /// displaying values.
  options: string[];
  selected: string[];
  onChange: (selected: string[], name: string) => void;
}> = (props) => {
  function onChange(event: CustomEvent & { target: SlSelect }) {
    props.onChange(ensureArray(event.target.value), props.name);
  }

  // https://shoelace.style/components/select
  return <sl-select multiple clearable
    value={props.selected}
    name={props.name}
    max-options-visible="0"
    onSl-change={onChange}>
    <span slot="label">{props.label}</span>
    <For each={props.options}>{(option) =>
      <sl-option value={option}>{option.replaceAll('_', ' ')}</sl-option>}
    </For>
  </sl-select>
};
