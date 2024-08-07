import { md } from "@lib/markdown";
import { splitProps, type Component, type JSX } from "solid-js";

export const Markdown: Component<{ source: string } & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [local, divProps] = splitProps(props, ["source"]);
  return <div innerHTML={String(md.processSync(local.source))} {...divProps} />;
};
