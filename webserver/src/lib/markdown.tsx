
import type { PhrasingContent, Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified, type Plugin } from 'unified';

const wrapIngredients: Plugin<[], Root> = function () {
  function replace(value: string): PhrasingContent {
    return {
      type: 'text',
      value,
      data: {
        hName: 'recipe-ingredient',
        hChildren: [{ type: 'text', value }],
      }
    };
  }
  return (tree, _file) => {
    const ingredientNames = this.data('ingredientNames');
    if (ingredientNames) {
      findAndReplace(tree, ingredientNames.map(ingredient => [ingredient, replace]));
    }
  };
};

declare module 'unified' {
  interface Data {
    ingredientNames?: Array<string> | undefined
  }
}

export const md = unified()
  .use(remarkParse)
  .use(wrapIngredients)
  .use(remarkRehype)
  .use(rehypeSanitize, {
    ...defaultSchema,
    tagNames: [...defaultSchema.tagNames ?? [], 'recipe-ingredient'],
  })
  .use(rehypeStringify)
  .freeze();
