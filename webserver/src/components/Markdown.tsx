import { md } from "@lib/markdown";
import type { Component } from "solid-js";

export const Markdown: Component<{ source: string }> = (props) => {
  return <div innerHTML={md.render(props.source)} />;
};
