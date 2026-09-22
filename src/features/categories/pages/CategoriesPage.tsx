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
import { toastApiError } from "@shared/lib/apiError";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import {
  subtreeIds,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from "@features/categories/api/categoriesApi";
import {
  categorySchema,
  type CategoryFormValues,
} from "@features/categories/schemas/category.schema";
import type { CategoryNode } from "@features/categories/types";

/** Radix Select cannot use "" as an item value, so "no parent" gets a sentinel. */
const NO_PARENT = "__none__";

export default function CategoriesPage() {
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CategoryNode | null>(null);

  const { currentData, isFetching, isError, error, refetch } = useListCategoriesQuery("admin");
  const data = useMemo(() => currentData ?? [], [currentData]);
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
  const openEdit = (c: CategoryNode) => {
    setEditing(c);
    form.reset({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      iconUrl: c.iconUrl ?? "",
      // A parent deleted before the API refused such deletes is gone for good:
      // resending its id fails with CATEGORY_NOT_FOUND and the picker would show
      // nothing. Start from "None", which is where the table already lists it.
      parentId: c.parentId && data.some((p) => p.id === c.parentId) ? c.parentId : "",
      sortOrder: c.sortOrder,
      active: c.active,
    });
    setOpen(true);
  };

  // A category cannot sit under itself or under one of its own descendants.
  const parentChoices = useMemo(() => {
    const blocked = editing ? subtreeIds(data, editing.id) : new Set<string>();
    return data.filter((c) => !blocked.has(c.id));
  }, [data, editing]);

  const columns = useMemo<ColumnDef<CategoryNode>[]>(
    () => [
      {
        header: "Name",
        cell: ({ row }) => (
          <span
            className="font-medium text-gray-900 dark:text-white"
            style={{ paddingLeft: `${row.original.depth * 1.25}rem` }}
          >
            {row.original.depth > 0 && <span className="mr-1 text-gray-400" aria-hidden>└</span>}
            {row.original.name}
          </span>
        ),
      },
      {
        header: "Parent",
        cell: ({ row }) => {
          const { parentId } = row.original;
          if (!parentId) return <span className="text-sm text-gray-500">—</span>;
          const parent = data.find((c) => c.id === parentId);
          // A parent that was deleted leaves the child listed at the top level;
          // say so rather than show "—", which reads as "has no parent".
          return parent ? (
            <span className="text-sm text-gray-500">{parent.path}</span>
          ) : (
            <span className="text-sm text-warning-700 dark:text-warning-300">Deleted category</span>
          );
        },
      },
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
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setToDelete(row.original)}>
              <Trash2 className="size-4 text-error-500" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize courses into discoverable topics."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New category</Button>}
      />

      <DataTable<CategoryNode>
        data={data}
        columns={columns}
        isLoading={isFetching && !currentData}
        isError={isError}
        error={error}
        onRetry={refetch}
        errorWhat="categories"
        emptyTitle="No categories yet"
        getRowId={(r) => r.id}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription className="sr-only">Name, slug, parent and visibility of the category.</DialogDescription>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              // The PUT replaces the parent too, so the current one is always sent:
              // leaving it out would move a sub-category to the top level.
              const body = { ...values, parentId: values.parentId || undefined };
              try {
                if (editing) await updateCategory({ id: editing.id, body }).unwrap();
                else await createCategory(body).unwrap();
                toast.success("Saved");
                setOpen(false);
              } catch (e) {
                // e.g. SLUG_ALREADY_EXISTS — "Save failed" used to hide it.
                toastApiError(e, "Could not save the category", form);
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
              <FormField<CategoryFormValues> name="parentId" label="Parent" description="Leave empty for a top-level category.">
                {({ field, invalid }) => (
                  <Select
                    value={(field.value as string) || NO_PARENT}
                    onValueChange={(v) => field.onChange(v === NO_PARENT ? "" : v)}
                  >
                    <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT}>None (top level)</SelectItem>
                      {parentChoices.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.path}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description="Courses in this category may need reassigning."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          // A refusal (e.g. CATEGORY_IN_USE) is shown by ConfirmDialog, which stays open.
          await deleteCategory(toDelete.id).unwrap();
          toast.success("Deleted");
        }}
      />
    </>
  );
}
