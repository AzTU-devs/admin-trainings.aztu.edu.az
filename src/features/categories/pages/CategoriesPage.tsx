import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
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
import { CategorySwatch } from "@shared/components/bright";
import { TooltipProvider } from "@shared/components/ui/Tooltip";
import { IconAction } from "@features/users/components/IconAction";
import { cn } from "@shared/lib/cn";

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
  const openEdit = useCallback((c: CategoryDto) => {
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
  }, [form]);

  /** Edit and delete as quiet icons with tooltips; the bin turns red only on hover or focus. */
  const actions = useCallback(
    (c: CategoryDto, className?: string) => (
      <div className={cn("flex justify-end gap-0.5", className)}>
        <IconAction label="Edit" onClick={() => openEdit(c)}>
          <Pencil className="size-4" />
        </IconAction>
        <IconAction label="Delete" tone="danger" onClick={() => setDelId(c.id)}>
          <Trash2 className="size-4" />
        </IconAction>
      </div>
    ),
    [openEdit],
  );

  const columns = useMemo<ColumnDef<CategoryDto>[]>(
    () => [
      {
        header: "Name",
        cell: ({ row }) => (
          <div className="min-w-[14rem] max-w-[34rem]">
            <CategoryIdentity category={row.original} />
          </div>
        ),
      },
      { header: "Slug", cell: ({ row }) => <Slug slug={row.original.slug} /> },
      {
        header: "Order",
        accessorKey: "sortOrder",
        cell: ({ row }) => <OrderChip order={row.original.sortOrder} />,
      },
      { header: "Active", cell: ({ row }) => <ActivePill active={row.original.active} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => actions(row.original),
      },
    ],
    [actions],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <PageHeader
        title="Categories"
        description="Organize courses into discoverable topics."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New category</Button>}
      />

      {/* Phones: swatch and name, then the technical line, then the actions
          within reach. The table takes over from 768px. */}
      <DataTable<CategoryDto>
        data={data}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No categories yet"
        getRowId={(r) => r.id}
        renderMobileRow={(c) => (
          <div className="text-sm text-ink-2">
            <CategoryIdentity category={c} />
            {/* Under the name (past the swatch): the slug on a line of its
                own, then order and visibility with the actions at the end. */}
            <div className="pl-[58px]">
              <Slug slug={c.slug} className="mt-1.5 block truncate" />
              <div className="mt-1.5 flex items-center gap-2">
                <OrderChip order={c.sortOrder} labelled />
                <ActivePill active={c.active} />
                {actions(c, "-mr-2 ml-auto")}
              </div>
            </div>
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          {/* The swatch follows the slug and name as they are typed: the colour
              family is derived from them, here as on the public website. */}
          <DialogHeader className="flex-row items-center gap-3.5">
            <LiveSwatch control={form.control} />
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
                  <div className="flex h-11 items-center gap-2">
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
    </TooltipProvider>
  );
}

/**
 * The category's own colour and motif — the same swatch the website shows
 * beside it — so the table reads like the catalogue. A hidden category's
 * swatch is faded, so what visitors can't see reads as switched off at a
 * glance down the list.
 */
function CategoryIdentity({ category: c }: { category: CategoryDto }) {
  return (
    <div className="flex items-center gap-3.5">
      <CategorySwatch
        category={c}
        className={cn("size-11 transition-[opacity,filter] duration-200", !c.active && "opacity-45 grayscale")}
      />
      <div className="min-w-0">
        <p className="break-words font-semibold text-ink">{c.name}</p>
        {/* Many descriptions only repeat the name; a second line saying the
            same thing again is noise. */}
        {c.description && c.description.trim().toLowerCase() !== c.name.trim().toLowerCase() && (
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{c.description}</p>
        )}
      </div>
    </div>
  );
}

function Slug({ slug, className }: { slug: string; className?: string }) {
  return <code className={cn("font-mono text-[12.5px] text-ink-3", className)}>{slug}</code>;
}

/**
 * The sort order as a small mono chip. In the table the "Order" header names
 * it; on the phone cards there is no header, so `labelled` adds the sort icon
 * and the word for screen readers (and a hover title) — a bare "0" beside
 * the Active pill read like a count.
 */
function OrderChip({ order, labelled }: { order: number; labelled?: boolean }) {
  return (
    <span
      title={labelled ? "Order" : undefined}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-ink/6 px-2 font-mono text-[12px] font-medium text-ink-2",
        labelled && "pl-2 pr-2.5",
      )}
    >
      {labelled && (
        <>
          <ArrowUpDown aria-hidden className="size-3.5 text-ink-3" />
          <span className="sr-only">Order</span>
        </>
      )}
      {order}
    </span>
  );
}

function ActivePill({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"} dot>{active ? "Active" : "Hidden"}</Badge>;
}

/**
 * The colour a category will get, previewed from the form's current slug and
 * name. `useWatch` keeps the re-render on each keystroke inside this swatch.
 */
function LiveSwatch({ control }: { control: Control<CategoryFormValues> }) {
  const [slug, name] = useWatch({ control, name: ["slug", "name"] });
  return <CategorySwatch category={{ slug, name }} className="size-11" />;
}
