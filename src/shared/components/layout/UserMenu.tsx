import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@features/auth/hooks/useAuth";
import { ROUTES } from "@shared/constants/routes";
import { cn } from "@shared/lib/cn";
import { hueFor, initialsOf } from "@shared/lib/hue";
import { formatEnum } from "@shared/lib/enums";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const fullName = user.fullName || user.email;
  // Sentence case, as every role pill spells it ("Super admin").
  const roleLabel = formatEnum(user.roles[0] ?? "USER");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group inline-flex h-11 items-center gap-2.5 rounded-full bg-surface py-1 pl-1 pr-2.5 shadow-[inset_0_0_0_1px_var(--line)] transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_var(--line-2)] data-[state=open]:shadow-[inset_0_0_0_1px_var(--line-2)] md:pr-3.5"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            // Initials on the person's hue field, as on the website.
            <span className={cn("av round size-9 text-[13px]", hueFor(user.email || fullName))}>
              <span className="ini">{initialsOf(fullName)}</span>
            </span>
          )}
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-[140px] truncate text-[13.5px] font-semibold text-ink">{fullName}</span>
            <span className="mt-0.5 block text-[11.5px] text-ink-3">{roleLabel}</span>
          </span>
          <ChevronDown className="size-4 text-ink-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          // --raised: a step up from the cards at night (the shadow barely shows there).
          className="z-[60] w-64 animate-pop-in rounded-[22px] border border-raised-line bg-raised p-2 text-ink shadow-[var(--shadow-lg)]"
        >
          <div className="mb-1.5 border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{user.email}</p>
          </div>
          <MenuItem onSelect={() => navigate(ROUTES.profile)} Icon={UserIcon}>
            Profile
          </MenuItem>
          <MenuItem onSelect={() => navigate(ROUTES.settings)} Icon={Settings}>
            Settings
          </MenuItem>
          <DropdownMenu.Separator className="-mx-2 my-1.5 h-px bg-line" />
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
        "flex h-10 cursor-pointer items-center gap-2.5 rounded-[12px] px-3 text-sm font-medium outline-none transition-colors",
        danger ? "text-danger focus:bg-danger-tint" : "text-ink-2 focus:bg-paper-2 focus:text-ink",
      )}
    >
      <Icon className="size-4" />
      <span>{children}</span>
    </DropdownMenu.Item>
  );
}
