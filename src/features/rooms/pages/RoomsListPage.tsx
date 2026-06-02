import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
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
import { Input } from "@shared/components/ui/Input";
import { Textarea } from "@shared/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { Label } from "@shared/components/ui/Label";
import { ImageUploader } from "@shared/components/forms/ImageUploader";
import { MediaImage } from "@shared/components/ui/MediaImage";
import { RoomStatusBadge } from "@features/rooms/components/RoomStatusBadge";
import {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useListRoomsQuery,
  useUpdateRoomMutation,
} from "@features/rooms/api/roomsApi";
import { roomSchema, type RoomFormValues } from "@features/rooms/schemas/room.schema";
import type { RoomDto } from "@features/rooms/types";
import { ROOM_STATUS } from "@shared/types/lms";

export default function RoomsListPage() {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomDto | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const { data, isFetching } = useListRoomsQuery({ page, size: 10 });
  const [createRoom] = useCreateRoomMutation();
  const [updateRoom] = useUpdateRoomMutation();
  const [deleteRoom] = useDeleteRoomMutation();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "", roomNumber: "", building: "", capacity: 20,
      description: "", status: ROOM_STATUS.AVAILABLE, hourlyRate: 0, currency: "AZN", imageMediaIds: [],
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", roomNumber: "", building: "", capacity: 20, description: "", status: ROOM_STATUS.AVAILABLE, hourlyRate: 0, currency: "AZN", imageMediaIds: [] });
    setOpen(true);
  };
  const openEdit = (r: RoomDto) => {
    setEditing(r);
    form.reset({
      name: r.name, roomNumber: r.roomNumber, building: r.building ?? "", capacity: r.capacity,
      description: r.description ?? "", status: r.status, hourlyRate: r.hourlyRate, currency: r.currency,
      imageMediaIds: r.imageMediaIds ?? [],
    });
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<RoomDto>[]>(
    () => [
      {
        header: "Room",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-12 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
              {row.original.imageMediaIds?.[0] && (
                <MediaImage mediaId={row.original.imageMediaIds[0]} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{row.original.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {row.original.roomNumber}{row.original.building ? ` · ${row.original.building}` : ""}
              </p>
            </div>
          </div>
        ),
      },
      { header: "Capacity", accessorKey: "capacity" },
      { header: "Rate / h", cell: ({ row }) => `${row.original.hourlyRate} ${row.original.currency}` },
      { header: "Status", cell: ({ row }) => <RoomStatusBadge status={row.original.status} /> },
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
        title="Rooms"
        description="Manage classrooms, capacity, hourly rate and status."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New room</Button>}
      />

      <DataTable<RoomDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No rooms yet"
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(r) => r.id}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit room" : "New room"}</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              try {
                if (editing) await updateRoom({ id: editing.id, body: values }).unwrap();
                else await createRoom(values).unwrap();
                toast.success("Saved");
                setOpen(false);
              } catch {
                toast.error("Save failed");
              }
            }}
          >
            <FormSection title="">
              <FormField<RoomFormValues> name="name" label="Name" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomFormValues> name="roomNumber" label="Room number" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomFormValues> name="building" label="Building">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <FormField<RoomFormValues> name="capacity" label="Capacity" required>
                {({ field, invalid }) => <Input type="number" min={1} {...field} value={field.value as number} invalid={invalid} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />}
              </FormField>
              <FormField<RoomFormValues> name="status" label="Status" required>
                {({ field, invalid }) => (
                  <Select value={field.value as string} onValueChange={field.onChange}>
                    <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOM_STATUS.AVAILABLE}>Available</SelectItem>
                      <SelectItem value={ROOM_STATUS.MAINTENANCE}>Maintenance</SelectItem>
                      <SelectItem value={ROOM_STATUS.RESERVED}>Reserved</SelectItem>
                      <SelectItem value={ROOM_STATUS.RETIRED}>Retired</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <FormField<RoomFormValues> name="hourlyRate" label="Hourly rate" required>
                {({ field, invalid }) => <Input type="number" step="0.01" {...field} value={field.value as number} invalid={invalid} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />}
              </FormField>
              <FormField<RoomFormValues> name="currency" label="Currency" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} maxLength={3} />}
              </FormField>
              <FormField<RoomFormValues> name="description" label="Description" className="md:col-span-2">
                {({ field, invalid }) => <Textarea rows={3} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <div className="md:col-span-2">
                <Label required>Images</Label>
                <div className="mt-1.5">
                  <ImageUploader
                    value={form.watch("imageMediaIds")}
                    onChange={(ids) => form.setValue("imageMediaIds", ids, { shouldValidate: true })}
                    min={2}
                  />
                </div>
                {form.formState.errors.imageMediaIds && (
                  <p className="mt-1 text-xs text-error-600">{form.formState.errors.imageMediaIds.message as string}</p>
                )}
              </div>
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
        title="Delete room?"
        description="Existing bookings for this room may be affected."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!delId) return;
          await deleteRoom(delId).unwrap();
          toast.success("Deleted");
        }}
      />
    </>
  );
}
