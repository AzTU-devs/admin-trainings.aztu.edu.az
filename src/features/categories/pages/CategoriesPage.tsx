import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import { Switch } from "@shared/components/ui/Switch";
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
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from "@features/categories/api/categoriesApi";
import {
  categorySchema,
  type CategoryFormValues,
} from "@features/categories/schemas/category.schema";
import type { CategoryDto } from "@features/categories/types";

export default function CategoriesPage() {
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const { data = [], isFetching } = useListCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "", iconUrl: "", parentId: "", sortOrder: 0, active: true },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", slug: "", description: "", iconUrl: "", parentId: "", sortOrder: 0, active: true });
    setOpen(true);
  };
  const openEdit = (c: CategoryDto) => {
    setEditing(c);
    form.reset({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      iconUrl: c.iconUrl ?? "",
      parentId: c.parentId ?? "",
      sortOrder: c.sortOrder,
      active: c.active,
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<CategoryDto>[]>(
    () => [
      { header: "Name", cell: ({ row }) => <span className="font-medium text-gray-900 dark:text-white">{row.original.name}</span> },
      { header: "Slug", cell: ({ row }) => <code className="text-xs text-gray-500">{row.original.slug}</code> },
      { header: "Order", accessorKey: "sortOrder" },
      { header: "Active", cell: ({ row }) => <Badge tone={row.original.active ? "success" : "neutral"} dot>{row.original.active ? "Active" : "Hidden"}</Badge> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(row.original)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDelId(row.original.id)}>
              <Trash2 className="size-4 text-error-500" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize courses into discoverable topics."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New category</Button>}
      />

      <DataTable<CategoryDto>
        data={data}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No categories yet"
        getRowId={(r) => r.id}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              const body = { ...values, parentId: values.parentId || undefined };
              try {
                if (editing) await updateCategory({ id: editing.id, body }).unwrap();
                else await createCategory(body).unwrap();
                toast.success("Saved");
                setOpen(false);
              } catch {
                toast.error("Save failed");
              }
            }}
          >
            <FormSection title="">
              <FormField<CategoryFormValues> name="name" label="Name" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<CategoryFormValues> name="slug" label="Slug" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} placeholder="software-engineering" />}
              </FormField>
              <FormField<CategoryFormValues> name="sortOrder" label="Sort order" required>
                {({ field, invalid }) => (
                  <Input type="number" {...field} value={field.value as number} invalid={invalid} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
                )}
              </FormField>
              <FormField<CategoryFormValues> name="iconUrl" label="Icon URL">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <FormField<CategoryFormValues> name="description" label="Description" className="md:col-span-2">
                {({ field, invalid }) => <Textarea rows={2} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <FormField<CategoryFormValues> name="active" label="Active">
                {({ field }) => (
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                  </div>
                )}
              </FormField>
            </FormSection>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete category?"
        description="Courses in this category may need reassigning."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!delId) return;
          await deleteCategory(delId).unwrap();
          toast.success("Deleted");
        }}
      />
    </>
  );
}
