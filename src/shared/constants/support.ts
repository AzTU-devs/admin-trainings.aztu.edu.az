/**
 * Where people using the dashboard are sent for help: the sign-in page's
 * "Trouble signing in?" line and the crash card's "send this ID". One constant
 * so the two can never name different inboxes.
 */
export const HELPDESK_EMAIL = "helpdesk@aztu.edu.az";

/** A mailto: link with the subject and body filled in (both URL-encoded). */
export function helpdeskMailto(subject: string, body?: string): string {
  const q = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  // URLSearchParams writes spaces as "+", which mail clients show literally.
  return `mailto:${HELPDESK_EMAIL}?${q.toString().replace(/\+/g, "%20")}`;
}
