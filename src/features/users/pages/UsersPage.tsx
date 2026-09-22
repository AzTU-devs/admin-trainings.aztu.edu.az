import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockOpen, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
import { DataTable } from "@shared/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Checkbox } from "@shared/components/ui/Checkbox";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Label } from "@shared/components/ui/Label";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";
import { apiErrorMessage, toastApiError } from "@shared/lib/apiError";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useListUsersQuery,
  useSetUserStatusMutation,
  useUnlockUserMutation,
  useUpdateUserMutation,
} from "@features/users/api/usersApi";
import { usePermissions } from "@features/auth/hooks/usePermissions";
import { useAuth } from "@features/auth/hooks/useAuth";
import {
  newUserSchema,
  userSchema,
  type UserFormValues,
} from "@features/users/schemas/user.schema";
import type { AdminUser, UserStatus } from "@features/users/types";
import { ALL_ROLES, ROLES, type Role } from "@shared/constants/roles";
import { enumLabel } from "@shared/constants/enumLabels";

const TONE: Record<UserStatus, "success" | "warning" | "neutral" | "danger"> = {
  ACTIVE: "success",
  PENDING: "warning",
  DISABLED: "neutral",
  LOCKED: "danger",
};

type RoleFilter = "ALL" | Role;
type StatusFilter = "ALL" | "ACTIVE" | "DISABLED" | "LOCKED";

const EMPTY: UserFormValues = { email: "", fullName: "", phone: "", roles: [], password: "" };

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [toDisable, setToDisable] = useState<AdminUser | null>(null);

  const { isSuperAdmin } = usePermissions();
  const { user: me } = useAuth();
  const debouncedSearch = useDebouncedValue(search, 300);
  const { currentData: data, isFetching, isError, error, refetch } = useListUsersQuery({
    page,
    size: 10,
    search: debouncedSearch.trim() || undefined,
    role: roleFilter === "ALL" ? undefined : roleFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [unlockUser] = useUnlockUserMutation();

  // One form for both dialogs, validated by whichever schema fits: a new account
  // needs a password, an edit never sends one. The resolver reads the mode at
  // validation time, so it does not matter that useForm captured it once.
  const editingRef = useRef(false);
  const resolver = useMemo<Resolver<UserFormValues>>(() => {
    const edit = zodResolver(userSchema);
    const create = zodResolver(newUserSchema) as unknown as Resolver<UserFormValues>;
    return (values, ctx, opts) => (editingRef.current ? edit : create)(values, ctx, opts);
  }, []);
  const form = useForm<UserFormValues>({ resolver, defaultValues: EMPTY });

  const openCreate = () => {
    editingRef.current = false;
    setEditing(null);
    form.reset(EMPTY);
    setOpen(true);
  };
  const openEdit = (u: AdminUser) => {
    editingRef.current = true;
    setEditing(u);
    form.reset({ email: u.email, fullName: u.fullName, phone: u.phone ?? "", roles: u.roles, password: "" });
    setOpen(true);
  };

  // Arriving from a course's "Add İştirakçi" with an unknown email: open the
  // create dialog for that person as a participant, then drop the state so a
  // reload does not reopen it.
  const location = useLocation();
  const navigate = useNavigate();
  const createFor = (location.state as { createParticipant?: string } | null)?.createParticipant;
  useEffect(() => {
    if (!createFor) return;
    editingRef.current = false;
    setEditing(null);
    form.reset({ ...EMPTY, email: createFor, roles: [ROLES.USER] });
    setOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [createFor, form, navigate, location.pathname]);

  const isSelf = (u: AdminUser) => me != null && String(me.id) === u.id;
  // Only a SUPER_ADMIN may change another administrator's account (the API
  // answers ROLE_ESCALATION_FORBIDDEN), and nobody may disable or delete their
  // own. Offering those buttons only produced a 403 or an unhandled error.
  const canManage = (u: AdminUser) =>
    isSuperAdmin || isSelf(u) || !(u.roles.includes(ROLES.ADMIN) || u.roles.includes(ROLES.SUPER_ADMIN));

  const enable = async (u: AdminUser) => {
    try {
      if (u.status === "LOCKED" && isSuperAdmin) await unlockUser(u.id).unwrap();
      else await setStatus({ id: u.id, status: "ACTIVE" }).unwrap();
      toast.success(`${u.fullName} can sign in again`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not enable the account"));
    }
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        header: "User",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {row.original.fullName}
              {isSelf(row.original) && <span className="ml-1.5 text-xs font-normal text-gray-500">(you)</span>}
            </p>
            <p className="text-xs text-gray-500 truncate">{row.original.email}</p>
          </div>
        ),
      },
      {
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <Badge key={r} tone={r === ROLES.USER ? "neutral" : "brand"}>{enumLabel("role", r)}</Badge>
            ))}
          </div>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <Badge
            tone={TONE[row.original.status] ?? "neutral"}
            dot
            title={row.original.lockedUntil ? `Locked out until ${new Date(row.original.lockedUntil).toLocaleString()}` : undefined}
          >
            {enumLabel("userStatus", row.original.status)}
          </Badge>
        ),
      },
      { header: "Last login", cell: ({ row }) => row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : "—" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const u = row.original;
          if (!canManage(u)) {
            return <p className="text-right text-xs text-gray-400">Managed by super admins</p>;
          }
          const self = isSelf(u);
          const active = u.status === "ACTIVE";
          return (
            <div className="flex justify-end gap-1">
              {!self &&
                (active ? (
                  <Button variant="ghost" size="icon" aria-label="Disable user" title="Disable user" onClick={() => setToDisable(u)}>
                    <ShieldOff className="size-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={u.status === "LOCKED" ? "Unlock user" : "Enable user"}
                    title={u.status === "LOCKED" ? "Unlock user" : "Enable user"}
                    onClick={() => void enable(u)}
                  >
                    {u.status === "LOCKED" ? <LockOpen className="size-4" /> : <ShieldCheck className="size-4 text-success-600" />}
                  </Button>
                ))}
              <Button variant="ghost" size="icon" aria-label="Edit" title="Edit user" onClick={() => openEdit(u)}>
                <Pencil className="size-4" />
              </Button>
              {!self && (
                <Button variant="ghost" size="icon" aria-label="Delete" title="Delete user" onClick={() => setToDelete(u)}>
                  <Trash2 className="size-4 text-error-500" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin, me?.id, setStatus, unlockUser],
  );

  const roles = form.watch("roles");
  const rolesError = form.formState.errors.roles;
  const rolesMessage =
    rolesError?.message ?? rolesError?.root?.message ?? (Array.isArray(rolesError) ? rolesError[0]?.message : undefined);
  const editingSelf = editing != null && isSelf(editing);
  // Only a SUPER_ADMIN may grant SUPER_ADMIN; for anyone else the API refuses it.
  const roleChoices = ALL_ROLES.filter((r) => r !== ROLES.SUPER_ADMIN || isSuperAdmin);

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage portal accounts and their roles."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New user</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <Input
          placeholder="Search by name or email…"
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="sm:max-w-sm"
          aria-label="Search users"
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as RoleFilter); setPage(0); }}>
          <SelectTrigger className="sm:max-w-[180px]" aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{enumLabel("role", r)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}>
          <SelectTrigger className="sm:max-w-[160px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any status</SelectItem>
            {(["ACTIVE", "DISABLED", "LOCKED"] as const).map((s) => (
              <SelectItem key={s} value={s}>{enumLabel("userStatus", s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<AdminUser>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching && !data}
        isError={isError}
        error={error}
        onRetry={refetch}
        errorWhat="users"
        emptyTitle={debouncedSearch || roleFilter !== "ALL" || statusFilter !== "ALL" ? "No matching users" : "No users yet"}
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
            <DialogDescription>
              {editing ? editing.email : "Create an account and give its owner the temporary password."}
            </DialogDescription>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              try {
                if (editing) {
                  // The password field is not shown when editing, so none is sent.
                  const { password: _password, ...body } = values;
                  void _password;
                  await updateUser({ id: editing.id, body }).unwrap();
                  toast.success("User updated");
                } else {
                  await createUser(values).unwrap();
                  // No mail is sent: the API has no invitation flow. Saying
                  // "Invitation sent" left admins waiting for an email that never came.
                  toast.success("User created — share the temporary password with them");
                }
                setOpen(false);
              } catch (e) {
                toastApiError(e, "Could not save the user", form);
              }
            }}
          >
            <FormSection title="">
              <FormField<UserFormValues> name="fullName" label="Full name" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} maxLength={120} />}
              </FormField>
              <FormField<UserFormValues> name="email" label="Email" required>
                {({ field, invalid }) => <Input type="email" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<UserFormValues> name="phone" label="Phone">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} maxLength={32} />}
              </FormField>
              {!editing && (
                <FormField<UserFormValues>
                  name="password"
                  label="Temporary password"
                  required
                  description="Share this password with the user; nothing is emailed. 10+ characters with upper- and lowercase letters and a digit."
                >
                  {({ field, invalid }) => (
                    <Input type="text" autoComplete="new-password" {...field} value={(field.value as string) ?? ""} invalid={invalid} />
                  )}
                </FormField>
              )}
              <div className="md:col-span-2" data-form-field>
                <Label required>Roles</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {roleChoices.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={roles.includes(role)}
                        disabled={editingSelf}
                        onCheckedChange={(c) => {
                          const cur = form.getValues("roles");
                          form.setValue("roles", c ? [...cur, role] : cur.filter((r: Role) => r !== role), { shouldValidate: true });
                        }}
                      />
                      <span>{enumLabel("role", role)}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {editingSelf
                    ? "You can't change your own roles; ask another administrator."
                    : "İştirakçi can enrol in courses and leave reviews; keep it on experts who also learn."}
                </p>
                {rolesMessage && (
                  <p data-field-error role="alert" className="mt-1 text-xs text-error-600">{rolesMessage}</p>
                )}
              </div>
            </FormSection>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>{editing ? "Save" : "Create user"}</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDisable !== null}
        onOpenChange={(o) => !o && setToDisable(null)}
        title={`Disable ${toDisable?.fullName ?? "this user"}?`}
        description="They are signed out everywhere and can't sign in until an administrator enables the account again."
        confirmLabel="Disable"
        destructive
        onConfirm={async () => {
          if (!toDisable) return;
          await setStatus({ id: toDisable.id, status: "DISABLED" }).unwrap();
          toast.success(`${toDisable.fullName} disabled`);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.fullName ?? "user"}?`}
        description="The user will be removed and their sessions invalidated."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteUser(toDelete.id).unwrap();
          toast.success("User deleted");
        }}
      />
    </>
  );
}
