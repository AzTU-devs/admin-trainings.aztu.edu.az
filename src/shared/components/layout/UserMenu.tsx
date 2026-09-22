import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@features/auth/hooks/useAuth";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useGetMyTutorProfileQuery } from "@features/tutors/api/tutorsApi";
import { TutorAvatar } from "@features/tutors/components/TutorAvatar";
import { tutorAvatarSrc } from "@features/tutors/components/avatarSource";
import { ROUTES } from "@shared/constants/routes";
import { ROLES, type Role } from "@shared/constants/roles";
import { enumLabel } from "@shared/constants/enumLabels";
import { cn } from "@shared/lib/cn";

/** The role that best describes the account — roles[0] was often USER for an expert. */
const ROLE_RANK: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TUTOR, ROLES.USER];

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { isTutor } = usePermissions();
  const navigate = useNavigate();
  // An expert's own photo, not initials: nothing ever set AuthUser.avatarUrl,
  // so the header showed initials even after a photo was uploaded.
  const { data: tutor } = useGetMyTutorProfileQuery(undefined, { skip: !isTutor });

  if (!user) return null;

  const fullName = user.fullName || user.email;
  const top = ROLE_RANK.find((r) => user.roles.includes(r));
  const roleLabel = top ? enumLabel("role", top) : "";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 pl-1 pr-2.5 py-1 transition-colors"
        >
          <TutorAvatar
            src={tutor ? tutorAvatarSrc(tutor) : null}
            name={fullName}
            className="size-9"
            fallbackClassName="bg-brand-700 text-white text-xs font-semibold"
          />
          <span className="hidden md:block text-left leading-tight">
            <span className="block text-sm font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{fullName}</span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">{roleLabel}</span>
          </span>
          <ChevronDown className="size-4 text-gray-400" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] w-60 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-lg p-1.5"
        >
          <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 mb-1.5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          </div>
          <MenuItem onSelect={() => navigate(ROUTES.profile)} Icon={UserIcon}>
            Profile
          </MenuItem>
          <MenuItem onSelect={() => navigate(ROUTES.settings)} Icon={Settings}>
            Settings
          </MenuItem>
          <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-gray-800 my-1.5" />
          <MenuItem
            danger
            Icon={LogOut}
            onSelect={async () => {
              await signOut();
              navigate(ROUTES.signIn, { replace: true });
            }}
          >
            Sign out
          </MenuItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({
  children,
  Icon,
  onSelect,
  danger,
}: {
  children: React.ReactNode;
  Icon: typeof UserIcon;
  onSelect?: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer outline-none",
        danger
          ? "text-error-600 dark:text-error-400 focus:bg-error-50 dark:focus:bg-error-500/10"
          : "text-gray-700 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-white/5",
      )}
    >
      <Icon className="size-4" />
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}
