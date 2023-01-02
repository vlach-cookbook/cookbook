import { usernamePattern } from '@lib/valid-username';
import type { GoogleUser, User } from '@prisma/client';
import { Component, createSignal } from 'solid-js';

export const EditAccount: Component<{
  hasRecipes: boolean,
  user: User,
  otherUsernames: string[],
  serverOrigin: string,
  connectedAccounts: { google: GoogleUser[] }
}> = (props) => {
  const [username, setUsername] = createSignal(props.user.username || "");

  const otherUsernames = new Set(props.otherUsernames);

  function onUsernameInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
    const input = e.currentTarget;
    setUsername(input.value);
    if (otherUsernames.has(input.value)) {
      input.setCustomValidity("Someone else is using this username.");
    } else {
      input.setCustomValidity("");
    }
    input.reportValidity();
  }

  return <form method="post" action="/account">
    <input type="hidden" name="id" value={props.user.id} />
    <div>
      <label>
        Display Name <input type="text" name="name" value={props.user.name || ""}
          minlength="1" autocapitalize="words" />
      </label>
      <p><small>
        When another user sees one of your recipes, we'll use this name for you.
      </small></p>
    </div>
    {
      props.hasRecipes ? (
        <div>
          <p>Username: {props.user.username}</p>
          <p>
            <small>
              Your recipes appear at URLs like <code>
                {props.serverOrigin}/r/<mark>{props.user.username}</mark>/
                <var>recipe-name</var>
              </code>
              . For now, you can't change your username after you've added
              recipes.
            </small>
          </p>
        </div>
      ) : (
        <div>
          <label>
            Username <input type="text" name="username" value={username()}
              pattern={usernamePattern}
              title="Only letters, numbers, and hyphens are allowed."
              onInput={onUsernameInput} />
          </label>
          <p>
            <small>
              Your recipes will appear at URLs like <code>
                {props.serverOrigin}/r/{username() ? <mark>{username()}</mark> : <var>your-username</var>}/
                <var>recipe-name</var>
              </code>
              . You have to set your username before adding any recipes, and
              for now, you can't change it after that.
            </small>
          </p>
        </div>
      )
    }
    <p>Email: {props.connectedAccounts.google.map((user) => user.email).join(", ")}</p>
    <button type="submit">Save</button>
  </form>;
}
