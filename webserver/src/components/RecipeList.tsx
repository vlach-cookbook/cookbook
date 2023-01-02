import type { Recipe } from '@prisma/client';
import { Component, For } from 'solid-js';

export const RecipeList: Component<{
  recipes: (Recipe & { author: { username: string } })[];
}> = (props) => {
  return <ul>
    <For each={props.recipes}>{(recipe) =>
      <li>
        <a href={`/r/${recipe.author.username}/${recipe.slug}`}>{recipe.name}</a>
      </li>
    }</For>
  </ul>;
}
