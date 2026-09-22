import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { forwardRef } from "react";
import { cn } from "@shared/lib/cn";
import { hueFor, initialsOf } from "@shared/lib/hue";
import type { HueClass } from "@shared/lib/categoryStyle";

/*
 * Round avatars. With no photo, the initials sit on a hue field (the
 * website's round avatar): the colour comes from the person's name, so the
 * same person is the same colour on every page.
 *
 * The initials' size follows the avatar's, via the font size set on the root.
 */
const SIZES = {
  xs: "size-7 text-[11px]",
  sm: "size-8 text-[12px]",
  md: "size-10 text-[14px]",
  lg: "size-12 text-[16.5px]",
  xl: "size-16 text-[22px]",
} as const;

export const Avatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: keyof typeof SIZES;
  }
>(({ className, size = "md", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex shrink-0 overflow-hidden rounded-full", SIZES[size], className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    /**
     * The person's name. Gives the colour, and — when no children are passed —
     * the initials, mapped by hand for Azerbaijani (i → İ, ı → I).
     */
    name?: string | null;
    /** Force a hue family instead of deriving one from the name. */
    hue?: HueClass;
  }
>(({ className, name, hue, children, ...props }, ref) => {
  const seed = name || (typeof children === "string" ? children : "");
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "av round h-full w-full select-none",
        hue ?? hueFor(seed),
        className,
      )}
      {...props}
    >
      <span className="ini">{children ?? (initialsOf(name) || "?")}</span>
    </AvatarPrimitive.Fallback>
  );
});
AvatarFallback.displayName = "AvatarFallback";
