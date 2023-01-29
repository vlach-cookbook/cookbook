import "@lib/relative-time-interface";
import type { RecipeNote as Note, User } from "@prisma/client";
import { Component, createSignal, Match, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { GrowingTextarea } from "./GrowingTextarea";
import { Markdown } from "./Markdown";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export const RecipeNote: Component<{
  activeUserWroteNote?: boolean
  activeUserWroteRecipe?: boolean;
  note: Pick<Note, 'id' | 'createdAt' | 'recipeId' | 'authorId' | 'content' | 'public' | 'hidden'
    | 'authorCookedRecipeAt' | 'totalTimeSeconds' | 'prepTimeSeconds' | 'cookTimeSeconds'> & {
      author: { name: string; username: string; };
    }
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [note, setNote] = createStore<Pick<Note, 'content' | 'public'>>(props.note);

  let contentTextarea: HTMLTextAreaElement | undefined = undefined;
  function editButtonClicked() {
    setEditing(true);
    queueMicrotask(() => contentTextarea?.focus());
  }

  function onContentInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
    setNote('content', event.currentTarget.value);
  }

  function onSubmit(e: SubmitEvent) {
    if (props.activeUserWroteRecipe && (e.submitter as HTMLButtonElement | null)?.name === 'hide') {
      if (!confirm(`This will hide ${props.note.author.name}'s note from everyone except them. Are you sure?`)) {
        e.preventDefault();
      }
    }
  }

  return <li id={`note-${props.note.id}`} style={{ display: "block" }}
    itemprop="comment" itemscope itemtype="https://schema.org/Comment">
    <form method="post" action="/save_note" onSubmit={onSubmit}>
      <input type="hidden" name="noteId" value={props.note.id} />
      <div style={{ display: "flex", "flex-flow": "row wrap", "justify-content": "space-between" }}>
        <span itemprop="author"><a href={`/r/${props.note.author.username}`}>{props.note.author.name}</a></span>
        <span><relative-time datetime={props.note.createdAt.toISOString()} precision="minute">{dateFormatter.format(props.note.createdAt)}</relative-time></span>
        <Switch>
          <Match when={props.activeUserWroteNote}>
            <Switch>
              <Match when={!note.public}><span>Private</span></Match>
              <Match when={props.note.hidden}><span title="The recipe author has hidden this note from other users.">Hidden</span></Match>
            </Switch>
            {editing() ?
              <button type="submit">Save</button>
              : <button type="button" title="Edit" onClick={editButtonClicked} class="noprint">✏️</button>
            }
          </Match>
          <Match when={props.activeUserWroteRecipe}>
            <button type="submit" name="hide" value="on"
              title="Hide this note from everyone but its author">Hide</button>
          </Match>
        </Switch>
      </div>
      {editing() ?
        <><label title="Make this note visible to everyone, instead of just yourself.">
          <input type="checkbox" name="public" checked={note.public} /> Public
        </label>
          <GrowingTextarea ref={contentTextarea} name="content" onInput={onContentInput}>{note.content}</GrowingTextarea>
          <p>Preview:</p>
          <Markdown source={note.content} itemprop="text" />
        </>
        : <Markdown source={note.content} itemprop="text" />
      }
    </form>
  </li>;
};

export const AddRecipeNote: Component<{
  recipeId: number;
  editingUser: User;
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [content, setContent] = createSignal("");

  function startEditing() {
    setEditing(true);
    queueMicrotask(() => {
      contentTextarea?.focus();
    });
  }
  let contentTextarea: HTMLTextAreaElement | undefined = undefined;

  function onContentInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
    setContent(event.currentTarget.value);
  }

  return <>{editing()
    ? <form method="post" action={`/save_note`} class="noprint">
      <input type="hidden" name="recipeId" value={props.recipeId} />
      <label title="Make this note visible to everyone, instead of just yourself.">
        <input type="checkbox" name="public" checked /> Public
      </label>
      <GrowingTextarea ref={contentTextarea} name="content" onInput={onContentInput}>{content()}</GrowingTextarea>
      <p>Preview:</p>
      <Markdown source={content()} />
      <button type="submit">Save</button>
    </form>
    : <button type="button" onClick={startEditing} class="noprint">
      Add note
    </button>
  }</>;
};
