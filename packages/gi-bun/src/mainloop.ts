// SPDX-License-Identifier: Apache-2.0
// GLib main context integration with the Bun event loop. Bun owns the process
// loop; a short interval drains the default GLib main context without
// blocking, so GLib sources (timeouts, idles, GTK/GDK events, D-Bus) and Bun
// timers, sockets and promises all make progress on the same thread.

import { glib } from "./lib.ts";

let timer: ReturnType<typeof setInterval> | null = null;
let users = 0;
let period = 4;

/** Dispatch every ready GLib source of the default context without blocking. */
export function iterate(max = 256): number {
  let n = 0;
  while (n < max && glib.g_main_context_iteration(null, 0)) n++;
  return n;
}

/** True when the default GLib main context has pending events. */
export function pending(): boolean {
  return glib.g_main_context_pending(null) !== 0;
}

/**
 * Start pumping the default GLib main context from the Bun event loop.
 * Calls nest; every `start()` needs one `stop()`. The pump keeps the Bun
 * process alive while active.
 */
export function start(intervalMs = period): void {
  users++;
  if (timer && intervalMs === period) return;
  period = intervalMs;
  if (timer) clearInterval(timer);
  timer = setInterval(iterate, period);
}

export function stop(): void {
  users = Math.max(0, users - 1);
  if (users === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function isRunning(): boolean {
  return timer !== null;
}
