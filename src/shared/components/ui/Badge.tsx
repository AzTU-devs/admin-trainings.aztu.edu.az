import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/cn";
import { formatEnum, statusTone } from "@shared/lib/enums";

/*
 * Status and meta labels as Bright pills. Every tone reads a token that swaps
 * with the theme. `hue` takes the nearest category hue class — pass one in
 * `className` (e.g. `className="k-data"`) for a subject-coloured pill.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-ink/6 text-ink-2",
        brand: "bg-navy-tint text-navy",
        gold: "bg-gold-tint text-gold-ink",
        success: "bg-ok-tint text-ok",
        warning: "bg-warn-tint text-warn",
        danger: "bg-danger-tint text-danger",
        outline: "text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)]",
        hue: "bg-k-100 text-k-900",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        md: "h-6 px-2.5 text-[12px]",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  /**
   * The child is a raw API enum ("ACTIVE", "ADMIN_GRANT"): show it sentence
   * case ("Active", "Admin grant"), like every other pill. Same words — see
   * formatEnum in @shared/lib/enums.
   */
  humanize?: boolean;
}

export function Badge({ className, tone, size, dot, humanize, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {humanize && typeof children === "string" ? formatEnum(children) : children}
    </span>
  );
}

/**
 * A status value from the API as a pill: sentence case, with the one tone
 * that value has on every screen (statusTone), and a dot. Pass `tone` only
 * to override the shared map.
 *
 *   <StatusBadge value={user.status} />            // ACTIVE → green "Active"
 *   <StatusBadge value={e.source} dot={false} />  // FREE → neutral "Free"
 */
export function StatusBadge({
  value,
  tone,
  dot = true,
  ...props
}: Omit<BadgeProps, "children" | "humanize"> & { value: string }) {
  return (
    <Badge tone={tone ?? statusTone(value)} dot={dot} {...props}>
      {formatEnum(value)}
    </Badge>
  );
}

/**
 * A raw API enum outside a pill — a table cell, a meta row — in the same
 * sentence case as `<Badge humanize>`: "ADMIN_GRANT" → "Admin grant",
 * "ONLINE" → "Online". Same words (formatEnum), only the shouting goes.
 *
 *   <EnumText>{course.level}</EnumText>
 */
export function EnumText({ children, className }: { children: string; className?: string }) {
  return <span className={className}>{formatEnum(children)}</span>;
}
