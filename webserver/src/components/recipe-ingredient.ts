import slugify from '@lib/slugify';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('recipe-ingredient')
export class RecipeIngredient extends LitElement {
  static override styles = css`
    span {
      background-color: var(--yellow-highlight);
      outline: solid thin var(--yellow-outline);
      border-radius: .5ex;
    }
    span:focus-visible {
      outline: solid var(--yellow-outline-focused);
    }
  `;

  @property({ attribute: 'ingredient-id' })
  ingredientId: string | undefined = undefined;

  @state()
  private fullIngredient: string = "";

  override connectedCallback() {
    super.connectedCallback()
    if (this.ingredientId === undefined && this.textContent) {
      this.ingredientId = slugify(this.textContent);
    }
    this.fullIngredient = document.getElementById(this.ingredientId ?? "")?.innerText ?? "";
  }

  override render() {
    if (this.fullIngredient === "") {
      return html`<slot></slot>`;
    } else {
      return html`<sl-tooltip content=${this.fullIngredient}><span tabindex=0><slot></slot></span></sl-tooltip>`;
    }
  }
}
