import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { DataTable } from "@shared/components/tables/DataTable";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { Spinner } from "@shared/components/ui/Spinner";
import { cn } from "@shared/lib/cn";
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
import { RoomStatusBadge } from "@features/rooms/components/RoomStatusBadge";
import { RoomVisual } from "@features/rooms/components/RoomVisual";
import { CapacityPill } from "@features/rooms/components/CapacityPill";
import { formatAmount } from "@features/rooms/lib/money";
import { IconAction } from "@features/users/components/IconAction";
import { ListPager } from "@features/room-requests/components/ListPager";
import {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useListRoomsQuery,
  useUpdateRoomMutation,
} from "@features/rooms/api/roomsApi";
import { roomSchema, type RoomFormValues } from "@features/rooms/schemas/room.schema";
import type { RoomDto } from "@features/rooms/types";
import type { NormalizedError } from "@lib/axios/httpClient";
import { ROOM_STATUS } from "@shared/types/lms";

export default function RoomsListPage() {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomDto | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const { data, isFetching } = useListRoomsQuery({ page, size: 10 });
  const rooms = data?.content ?? [];
  const pagination = data
    ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages }
    : undefined;
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
  // Stable (the form instance never changes), so the columns memo can list it.
  const openEdit = useCallback((r: RoomDto) => {
    setEditing(r);
    form.reset({
      name: r.name, roomNumber: r.roomNumber, building: r.building ?? "", capacity: r.capacity,
      description: r.description ?? "", status: r.status, hourlyRate: r.hourlyRate, currency: r.currency,
      imageMediaIds: r.imageMediaIds ?? [],
    });
    setOpen(true);
  }, [form]);

  const columns = useMemo<ColumnDef<RoomDto>[]>(
    () => [
      {
        header: "Room",
        cell: ({ row }) => (
          <div className="flex min-w-[15rem] items-center gap-3.5">
            {/* The room's photo, or its generated floor plan in the room's colour. */}
            <RoomVisual room={row.original} thumb className="size-14 rounded-[16px]" />
            <RoomTitle room={row.original} />
          </div>
        ),
      },
      {
        header: "Capacity",
        accessorKey: "capacity",
        cell: ({ row }) => <CapacityPill capacity={row.original.capacity} />,
      },
      {
        header: "Rate / h",
        cell: ({ row }) => <Rate room={row.original} />,
      },
      { header: "Status", cell: ({ row }) => <RoomStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <RowActions onEdit={() => openEdit(row.original)} onDelete={() => setDelId(row.original.id)} />
        ),
      },
    ],
    [openEdit],
  );

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Manage classrooms, capacity, hourly rate and status."
        actions={<Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>New room</Button>}
      />

      {/* Phones: the same page of rooms as a list — the table's five columns
          do not fit 390px, and its actions would sit off-screen. The pager
          follows DataTable's rule: it stays under an empty page past the end
          (the last room on page 2 deleted), so Previous still leads back. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface md:hidden">
        {isFetching ? (
          <div className="px-6 py-16">
            <Spinner className="mx-auto" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            Icon={DoorOpen}
            title="No rooms yet"
            description="Try adjusting filters or come back later."
            className="rounded-none bg-transparent py-14"
          />
        ) : (
          <ul className="divide-y divide-line">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-start gap-3.5 p-4">
                <RoomVisual room={r} thumb className="size-14 rounded-[16px]" />
                <div className="min-w-0 flex-1">
                  <RoomTitle room={r} wrap />
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <RoomStatusBadge status={r.status} />
                    <CapacityPill capacity={r.capacity} />
                    <Rate room={r} />
                  </div>
                </div>
                <RowActions
                  className="-mr-2 -mt-1.5 flex-col"
                  onEdit={() => openEdit(r)}
                  onDelete={() => setDelId(r.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {pagination && (pagination.totalElements > 0 || pagination.page > 0) && (
          <ListPager className="px-4 py-3.5" pagination={pagination} onPageChange={setPage} />
        )}
      </div>

      <DataTable<RoomDto>
        className="hidden md:block"
        data={rooms}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No rooms yet"
        pagination={pagination}
        onPageChange={setPage}
        getRowId={(r) => r.id}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<DoorOpen />}>
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
              } catch (e) {
                // A bare "Save failed" hides why: a duplicate room number and
                // a rejected image both looked identical. Surface the server's
                // message, and pin field errors to their inputs.
                const err = e as NormalizedError;
                if (err.fieldErrors) {
                  for (const [k, v] of Object.entries(err.fieldErrors)) {
                    form.setError(k as keyof RoomFormValues, { message: v });
                  }
                }
                toast.error(err.message || "Save failed");
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
                  <p className="mt-1.5 text-[12.5px] text-danger">{form.formState.errors.imageMediaIds.message as string}</p>
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
          try {
            await deleteRoom(delId).unwrap();
            toast.success("Deleted");
          } catch (e) {
            toast.error((e as NormalizedError).message || "Could not delete the room");
          }
        }}
      />
    </>
  );
}

/* ---- Pieces shared by the table cells and the phone list ---- */

/** Name over room number · building. `wrap` lets both wrap (phone rows) instead of truncating (table cells). */
function RoomTitle({ room, wrap }: { room: RoomDto; wrap?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("font-semibold text-ink", wrap ? "break-words" : "truncate")}>{room.name}</p>
      <p className={cn("mt-1 flex min-w-0 items-center gap-x-1.5 text-[12.5px] text-ink-3", wrap && "flex-wrap")}>
        <span className={cn("font-mono text-[12px]", wrap ? "break-all" : "truncate")}>{room.roomNumber}</span>
        {room.building ? (
          <>
            <span aria-hidden>·</span>
            <span className={wrap ? "break-words" : "truncate"}>{room.building}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function Rate({ room }: { room: RoomDto }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink tabular-nums">{formatAmount(room.hourlyRate)}</span>{" "}
      <span className="text-[12.5px] font-medium text-ink-3">{room.currency}</span>
    </span>
  );
}

/**
 * Edit and delete as the quiet icon pair Users and Categories use: the bin is
 * ink at rest and turns red only on hover or focus, so ten rows are not a
 * column of red bins pulling the eye off the room names.
 */
function RowActions({ onEdit, onDelete, className }: { onEdit: () => void; onDelete: () => void; className?: string }) {
  return (
    <div className={cn("flex justify-end gap-0.5", className)}>
      <IconAction label="Edit" onClick={onEdit}>
        <Pencil className="size-4" />
      </IconAction>
      <IconAction label="Delete" tone="danger" onClick={onDelete}>
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );
}
