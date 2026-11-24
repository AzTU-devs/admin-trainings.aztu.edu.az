import type { FormEvent } from "react";

/**
 * The submit handler of a form that is rendered inside another form's
 * component tree, such as a dialog's own form opened from a field of a larger
 * one (the certificate and award dialogs inside the expert profile).
 *
 * The dialog sits in a portal, so the DOM has no nested forms — but React
 * still bubbles its submit up the component tree, into the form around it,
 * which would then submit too (saving the whole profile). Stopped here, then
 * handed to `handle`, typically react-hook-form's `handleSubmit(…)`.
 */
export function isolatedSubmit(handle: (event: FormEvent<HTMLFormElement>) => unknown) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    void handle(event);
  };
}
