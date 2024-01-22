import { createSignal, type Component } from "solid-js";

export const ScreenLock: Component = () => {
  const [locked, setLocked] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let wakeLockSentinel: WakeLockSentinel | null = null;

  function wakeLockReleased() {
    setLocked(false);
    setError("Screen may turn off.");
  }

  function clearWakeLockSentinel() {
    if (wakeLockSentinel) {
      wakeLockSentinel.removeEventListener("release", wakeLockReleased);
      wakeLockSentinel = null;
    }
  }

  async function screenLockChanged(event: InputEvent & { target: HTMLInputElement }) {
    setError(null);
    setLocked(event.target.checked);
    if (event.target.checked) {
      if (wakeLockSentinel?.released) {
        clearWakeLockSentinel();
      }
      if (wakeLockSentinel === null) {
        try {
          clearWakeLockSentinel();
          wakeLockSentinel = await navigator.wakeLock.request("screen");
        } catch (e) {
          setLocked(false);
          setError("Couldn't set screen to stay on.");
        }
        if (wakeLockSentinel) {
          wakeLockSentinel.addEventListener("release", wakeLockReleased)
        }
      }
    } else {
      if (wakeLockSentinel) {
        const oldSentinel = wakeLockSentinel;
        clearWakeLockSentinel();
        await oldSentinel.release();
      }
    }
  }

  // Including "⚠️" unconditionally makes sure the element's height doesn't change, and then we use
  // 'visibility:hidden' to make sure it's only visible when there's an error.
  return <label style={{ "text-align": "right" }}>
    <input type="checkbox" checked={locked()} oninput={screenLockChanged}></input> Keep the screen on.
    <div class="error"><span style={{ "visibility": error() ? undefined : "hidden" }}>⚠️</span>{error()}</div>
  </label>;
}
