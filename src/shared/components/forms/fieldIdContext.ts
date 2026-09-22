import { createContext } from "react";

/**
 * The id a FormField's label points at, for controls that render their
 * focusable element deeper than the element a FormField child returns — a
 * Radix Select's trigger sits inside a root that renders no DOM of its own.
 */
export const FieldIdContext = createContext<string | undefined>(undefined);
