import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockOpen, Pencil, Plus, Search, ShieldOff, Trash2, UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge, StatusBadge } from "@shared/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { DataTable } from "@shared/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Label } from "@shared/components/ui/Label";
import { Avatar, AvatarFallback } from "@shared/components/ui/Avatar";
import { TooltipProvider } from "@shared/components/ui/Tooltip";
import { IconAction } from "@features/users/components/IconAction";
import { ViewProfileLink } from "@features/user-profile/components/ViewProfileLink";
import { cn } from "@shared/lib/cn";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useListUsersQuery,
  useSetUserStatusMutation,
  useUnlockUserMutation,
  useUpdateUserMutation,
} from "@features/users/api/usersApi";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import {
  userSchema,
  type UserFormValues,
} from "@features/users/schemas/user.schema";
import type { AccountRole, AdminUser } from "@features/users/types";
import { PARTICIPANT_ROLE, ROLE_FILTERS, roleLabel } from "@features/users/lib/roles";
import { ALL_ROLES } from "@shared/constants/roles";
import { hueFor } from "@shared/lib/hue";

/**
 * Role pills, loudest for the most power: super admin in gold (the website's
 * accent), admin in navy, tutor on the teal field, anything else neutral —
 * the İştirakçi (USER) role most accounts hold stays quiet. Spelled like
 * every other enum on the dashboard ("SUPER_ADMIN" → "Super admin"), except
 * USER, which reads "İştirakçi" as the participants are called everywhere
 * else. No other screen shows roles as pills, so these tones clash with
 * nothing and keep the powerful accounts easy to spot.
 */
const ROLE_TONE: Partial<Record<string, "gold" | "brand" | "hue">> = {
  SUPER_ADMIN: "gold",
  ADMIN: "brand",
  TUTOR: "hue",
};

function RolePill({ role }: { role: string }) {
  const tone = ROLE_TONE[role] ?? "neutral";
  return (
    <Badge tone={tone} size="sm" className={cn(tone === "hue" && "k-build")}>
      {roleLabel(role)}
    </Badge>
  );
}

/** Seeded like the header's user menu (email first), so a person is the same colour in both places. */
function UserAvatar({ user }: { user: AdminUser }) {
  return (
    <Avatar size="md" className="shrink-0">
      <AvatarFallback name={user.fullName} hue={hueFor(user.email || user.fullName)} />
    </Avatar>
  );
}

function UserIdentity({ user }: { user: AdminUser }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-ink">{user.fullName}</p>
      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{user.email}</p>
    </div>
  );
}

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AccountRole | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const { isSuperAdmin } = usePermissions();
  const { data, isFetching } = useListUsersQuery({
    page,
    size: 10,
    search: search || undefined,
    role: roleFilter === "ALL" ? undefined : roleFilter,
  });
  const filtered = !!search || roleFilter !== "ALL";
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [unlockUser] = useUnlockUserMutation();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", fullName: "", phone: "", roles: [], password: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ email: "", fullName: "", phone: "", roles: [], password: "" });
    setOpen(true);
  };
  const openEdit = useCallback((u: AdminUser) => {
    setEditing(u);
    form.reset({ email: u.email, fullName: u.fullName, phone: u.phone ?? "", roles: u.roles, password: "" });
    setOpen(true);
  }, [form]);

  // The dashboard roles, plus İştirakçi for an account that already holds it:
  // the form resends the role set on save, so a participant's own role must be
  // shown (and kept) rather than silently dropped. Never offered to a new user.
  const roleChoices: AccountRole[] = editing?.roles.includes(PARTICIPANT_ROLE)
    ? [PARTICIPANT_ROLE, ...ALL_ROLES]
    : ALL_ROLES;

  /**
   * The row's actions as quiet icon buttons with tooltips — shared by the
   * table's last column and the phone rows, so both do exactly the same.
   */
  const actions = useCallback(
    (u: AdminUser, className?: string) => (
      <div className={cn("flex justify-end gap-0.5", className)}>
        {/* Super admins only (the link renders nothing for anyone else). */}
        <ViewProfileLink userId={u.id} />
        {isSuperAdmin && u.status === "LOCKED" && (
          <IconAction label="Unlock" onClick={async (e) => {
            e.stopPropagation();
            try {
              await unlockUser(u.id).unwrap();
              toast.success("Account unlocked");
            } catch {
              toast.error("Could not unlock account");
            }
          }}>
            <LockOpen className="size-4" />
          </IconAction>
        )}
        <IconAction label="Disable" onClick={async (e) => {
          e.stopPropagation();
          const next = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
          await setStatus({ id: u.id, status: next }).unwrap();
        }}>
          <ShieldOff className="size-4" />
        </IconAction>
        <IconAction label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
          <Pencil className="size-4" />
        </IconAction>
        <IconAction label="Delete" tone="danger" onClick={(e) => { e.stopPropagation(); setDelId(u.id); }}>
          <Trash2 className="size-4" />
        </IconAction>
      </div>
    ),
    [setStatus, unlockUser, isSuperAdmin, openEdit],
  );

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        header: "User",
        cell: ({ row }) => (
          <div className="flex min-w-[15rem] max-w-[28rem] items-center gap-3">
            <UserAvatar user={row.original} />
            <UserIdentity user={row.original} />
          </div>
        ),
      },
      {
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.roles.map((r) => <RolePill key={r} role={r} />)}
          </div>
        ),
      },
      { header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
      {
        header: "Last login",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => actions(row.original),
      },
    ],
    [actions],
  );

  const pagination = data
    ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages }
    : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <PageHeader
        title="Users"
        description="Every portal account — staff, tutors and İştirakçilər — and their roles."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New user</Button>}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or email…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-sm"
        />
        {/* İştirakçilər (the USER role) are listed with everyone else; this
            narrows the list to one kind of account. */}
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as AccountRole | "ALL"); setPage(0); }}>
          <SelectTrigger aria-label="Role" className="sm:max-w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Phones: who, then roles, then status with the actions within
          reach. The table takes over from 768px. */}
      <DataTable<AdminUser>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle={filtered ? "No matching users" : "No users yet"}
        emptyDescription={filtered ? "Try another name, email or role." : undefined}
        pagination={pagination}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
        renderMobileRow={(u) => (
          <div className="text-sm text-ink-2">
            <div className="flex items-center gap-3">
              <UserAvatar user={u} />
              <UserIdentity user={u} />
            </div>
            {/* Past the avatar: the roles, then the status with the actions
                that change it at the end of the same line. */}
            <div className="pl-[52px]">
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {u.roles.map((r) => <RolePill key={r} role={r} />)}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <StatusBadge value={u.status} />
                {actions(u, "-mr-2 ml-auto")}
              </div>
            </div>
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={editing ? <UserCog /> : <UserPlus />}>
            <DialogTitle>{editing ? "Edit user" : "Invite user"}</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              try {
                if (editing) await updateUser({ id: editing.id, body: values }).unwrap();
                else await createUser(values).unwrap();
                toast.success(editing ? "User updated" : "Invitation sent");
                setOpen(false);
              } catch {
                toast.error("Save failed");
              }
            }}
          >
            {/* Name and email each get the full width — the email is the
                longest value here and the one to check before saving, so it
                must never be clipped. Phone pairs with the temporary password
                when inviting, and takes the row alone when editing. */}
            <FormSection title="">
              <FormField<UserFormValues> name="fullName" label="Full name" required className="md:col-span-2">
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<UserFormValues> name="email" label="Email" required className="md:col-span-2">
                {({ field, invalid }) => <Input type="email" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<UserFormValues> name="phone" label="Phone" className={cn(editing && "md:col-span-2")}>
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              {!editing && (
                <FormField<UserFormValues> name="password" label="Temp password" description="Leave blank to email a magic-link.">
                  {({ field, invalid }) => <Input type="text" {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
                </FormField>
              )}
              <div className="md:col-span-2">
                <Label required>Roles</Label>
                {/* Each role a selectable pill (the website's filter chips): the
                    checkbox inside still carries the state and the keyboard. */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleChoices.map((role) => {
                    const on = form.watch("roles").includes(role);
                    return (
                      <label
                        key={role}
                        className={cn(
                          "inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-full pl-3 pr-4 text-[13.5px] font-semibold transition-[background-color,box-shadow,color] duration-200",
                          on
                            ? "bg-navy-tint text-navy shadow-[inset_0_0_0_1.5px_var(--navy)]"
                            : "bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)] hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--ink-3)]",
                        )}
                      >
                        <Checkbox
                          checked={on}
                          onCheckedChange={(c) => {
                            const cur = form.getValues("roles");
                            form.setValue("roles", c ? [...cur, role] : cur.filter((r: AccountRole) => r !== role), { shouldValidate: true });
                          }}
                        />
                        <span>{roleLabel(role)}</span>
                      </label>
                    );
                  })}
                </div>
                {form.formState.errors.roles && (
                  <p className="mt-1.5 text-[12.5px] font-medium text-danger">{form.formState.errors.roles.message as string}</p>
                )}
              </div>
            </FormSection>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>{editing ? "Save" : "Invite"}</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete user?"
        description="The user will be removed and their sessions invalidated."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (delId === null) return;
          await deleteUser(delId).unwrap();
          toast.success("User deleted");
        }}
      />
    </TooltipProvider>
  );
}
