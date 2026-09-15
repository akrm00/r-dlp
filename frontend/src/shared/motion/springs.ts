import type { Transition } from "motion/react";

/**
 * Motion tokens.
 *
 * Springs rather than durations: a spring animates from wherever the value
 * currently is, so a motion that gets re-targeted mid-flight stays continuous
 * instead of jumping. Apple describes them with two parameters — damping ratio
 * and response — which map onto Motion's `bounce` and `duration`.
 *
 * Everything here is critically damped (`bounce: 0`). Overshoot belongs to
 * motion that followed a physical gesture, like a flick or a throw; nothing in
 * this app does, so nothing here bounces.
 */
export const SPRING = {
  /** The default. Apple's "move / reposition" feel: damping 1.0, response ~0.35. */
  default: { type: "spring", bounce: 0, duration: 0.35 },
  /** Small chrome that must feel immediate: selection pills, icon swaps. */
  snappy: { type: "spring", bounce: 0, duration: 0.22 },
  /** Large surfaces arriving, where a slower settle reads as weight. */
  gentle: { type: "spring", bounce: 0, duration: 0.5 },
} as const satisfies Record<string, Transition>;

/** Distance a panel travels when tab content slides. Same value both ways. */
export const PANEL_SLIDE_PX = 12;
