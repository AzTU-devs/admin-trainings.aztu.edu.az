import { cn } from "@shared/lib/cn";

/**
 * Small label with the gold rule before it — section labels, eyebrow lines
 * above a title. Renders a <p> unless `as` says otherwise.
 */
export function Kicker({
  children,
  as: Tag = "p",
  className,
}: {
  children: React.ReactNode;
  as?: "p" | "span" | "h2" | "h3" | "div";
  className?: string;
}) {
  return (
    <Tag className={cn("kicker", className)}>
      <span className="rule" aria-hidden />
      {children}
    </Tag>
  );
}
