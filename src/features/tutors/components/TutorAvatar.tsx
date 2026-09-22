import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/Avatar";
import type { HueClass } from "@shared/lib/categoryStyle";
import { useLoadableSrc } from "@features/tutors/components/useLoadableSrc";

interface Props {
  /** From `tutorAvatarSrc`. Null or undefined shows the initials. */
  src?: string | null;
  /** Full name, for the initials fallback. */
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** The field behind the initials; by default derived from the name. */
  hue?: HueClass;
  className?: string;
  fallbackClassName?: string;
}

/**
 * A tutor's round photo with an initials fallback, which also covers a photo
 * that fails to load (a pending tutor's, say, on a route the viewer may not
 * read). The fallback is the website's round avatar: Azerbaijani-safe initials
 * (i → İ) on a hue field, so the same person is the same colour everywhere.
 */
export function TutorAvatar({ src, name, size, hue, className, fallbackClassName }: Props) {
  const resolved = useLoadableSrc(src);

  return (
    <Avatar size={size} className={className}>
      {resolved && <AvatarImage src={resolved} alt="" />}
      <AvatarFallback name={name.trim()} hue={hue} className={fallbackClassName} />
    </Avatar>
  );
}
