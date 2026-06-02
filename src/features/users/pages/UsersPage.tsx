import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Badge } from "@shared/components/ui/Badge";
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
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useListUsersQuery,
  useSetUserStatusMutation,
  useUpdateUserMutation,
} from "@features/users/api/usersApi";
import {
  userSchema,
  type UserFormValues,
} from "@features/users/schemas/user.schema";
import type { AdminUser, UserStatus } from "@features/users/types";
import { ALL_ROLES, type Role } from "@shared/constants/roles";

const TONE: Record<UserStatus, "success" | "warning" | "neutral"> = {
  ACTIVE: "success",
  PENDING: "warning",
  DISABLED: "neutral",
};

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const { data, isFetching } = useListUsersQuery({ page, size: 10, search: search || undefined });
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [setStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", fullName: "", phone: "", roles: [], password: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ email: "", fullName: "", phone: "", roles: [], password: "" });
    setOpen(true);
  };
  const openEdit = (u: AdminUser) => {
    setEditing(u);
    form.reset({ email: u.email, fullName: u.fullName, phone: u.phone ?? "", roles: u.roles, password: "" });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        header: "User",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.fullName}</p>
            <p className="text-xs text-gray-500 truncate">{row.original.email}</p>
          </div>
        ),
      },
      {
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}
          </div>
        ),
      },
      { header: "Status", cell: ({ row }) => <Badge tone={TONE[row.original.status]} dot>{row.original.status}</Badge> },
      { header: "Last login", cell: ({ row }) => row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleDateString() : "—" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" aria-label="Disable" onClick={async (e) => {
              e.stopPropagation();
              const next = row.original.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
              await setStatus({ id: row.original.id, status: next }).unwrap();
            }}>
              <ShieldOff className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDelId(row.original.id); }}>
              <Trash2 className="size-4 text-error-500" />
            </Button>
          </div>
        ),
      },
    ],
    [setStatus],
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage portal accounts and their roles."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New user</Button>}
      />

      <Input
        placeholder="Search by name or email…"
        leftIcon={<Search className="size-4" />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="sm:max-w-sm mb-4"
      />

      <DataTable<AdminUser>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No users yet"
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => String(r.id)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
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
            <FormSection title="">
              <FormField<UserFormValues> name="fullName" label="Full name" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<UserFormValues> name="email" label="Email" required>
                {({ field, invalid }) => <Input type="email" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<UserFormValues> name="phone" label="Phone">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              {!editing && (
                <FormField<UserFormValues> name="password" label="Temp password" description="Leave blank to email a magic-link.">
                  {({ field, invalid }) => <Input type="text" {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
                </FormField>
              )}
              <div className="md:col-span-2">
                <Label required>Roles</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.watch("roles").includes(role)}
                        onCheckedChange={(c) => {
                          const cur = form.getValues("roles");
                          form.setValue("roles", c ? [...cur, role] : cur.filter((r: Role) => r !== role), { shouldValidate: true });
                        }}
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.roles && (
                  <p className="mt-1 text-xs text-error-600">{form.formState.errors.roles.message as string}</p>
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
    </>
  );
}
