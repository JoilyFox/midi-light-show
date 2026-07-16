/**
 * Protocol-agnostic fixture model.
 *
 * The cue/mapping engine (and the manual UI) speak `FixtureState`. Each driver
 * (WiZ today; WLED / sACN / Art-Net later) translates that into its own wire format.
 * Keep this interface free of any WiZ-specific concepts so new drivers slot in cleanly.
 */

/** Abstract state the engine sets on a fixture. All fields optional → partial updates. */
export interface FixtureState {
  /** Power on/off. */
  on?: boolean;
  /** RGB channels, 0–255. If any of r/g/b is set, the fixture goes to colour mode. */
  r?: number;
  g?: number;
  b?: number;
  /** White color temperature in Kelvin (WiZ supports ~2200–6500). Ignored if RGB is set. */
  temp?: number;
  /** Warm / cool white channels, 0–255 (WiZ `w` / `c`). Used only if neither RGB nor temp set. */
  warm?: number;
  cool?: number;
  /** Brightness 10–100 (WiZ dimming floor is ~10). */
  brightness?: number;
}

/** A discovered fixture. For WiZ, `id` === `ip`. */
export interface Fixture {
  id: string;
  ip: string;
  name?: string;
  mac?: string;
  module?: string;
}

export interface FixtureDriver {
  /** Broadcast-discover fixtures on the LAN. */
  discover(timeoutMs?: number): Promise<Fixture[]>;
  /**
   * Fire-and-forget state change — sends one datagram, does NOT wait for an ACK.
   * Keeps the show hot-path non-blocking and avoids library retry penalties.
   */
  setState(id: string, state: FixtureState): void;
  /** Best-effort read of current device state (awaits a single response). */
  getState(id: string): Promise<Record<string, unknown> | null>;
  /** Release sockets. */
  close(): void;
}
