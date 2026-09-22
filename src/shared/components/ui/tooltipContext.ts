import { createContext, useContext } from "react";

/*
 * Radix's Tooltip throws outside a Provider. The app mounts one (AppProviders),
 * so hovering from one icon button to the next skips the delay; these flags
 * let a component that adds its own tooltip (Button's icon size) tell whether
 * it is inside that provider — and bring a local one when it is not (tests, a
 * component rendered on its own) — and whether it is already the trigger of a
 * caller's <Tooltip>, so it does not add a second.
 */
export const InsideTooltipProvider = createContext(false);
export const InsideTooltip = createContext(false);

/** True when a TooltipProvider is above this component. */
export function useInsideTooltipProvider() {
  return useContext(InsideTooltipProvider);
}

/** True inside a <Tooltip> (its trigger already has a label). */
export function useInsideTooltip() {
  return useContext(InsideTooltip);
}
