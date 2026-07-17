// Trailing throttle — cap calls to at most one per `waitMs`, but always deliver the
// last value. Critical for WiZ: dragging a slider must not flood the bulb with UDP.

export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): (...args: A) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  return (...args: A) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);
    pending = args;
    if (remaining <= 0) {
      last = now;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn(...args);
      pending = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (pending) fn(...pending);
        pending = null;
      }, remaining);
    }
  };
}
