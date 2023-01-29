import type { RelativeTimeElement } from '@github/relative-time-element';
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'relative-time': JSX.IntrinsicElements['time'] & Partial<Omit<RelativeTimeElement, keyof HTMLElement>>;
    }
  }
}
export { };
