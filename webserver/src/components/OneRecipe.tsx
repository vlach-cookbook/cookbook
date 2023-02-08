import type { Recipe } from '@prisma/client';
import type { Component } from 'solid-js';

export type RecipeTitleWithLinkFields = Pick<Recipe, 'name' | 'slug'> & {
  author: { username: string },
};

export const OneRecipe: Component<{ recipe: RecipeTitleWithLinkFields; }> = props => {
  return <a href={`/r/${props.recipe.author.username}/${props.recipe.slug}`}>{props.recipe.name}</a>;
};
