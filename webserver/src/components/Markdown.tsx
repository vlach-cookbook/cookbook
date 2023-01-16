import { md } from "@lib/markdown";
import { Component, JSX, splitProps } from "solid-js";

export const Markdown: Component<{ source: string } & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, divProps] = splitProps(props, ["source"]);
  return <div innerHTML={md.render(local.source)} {...divProps} />;
};
