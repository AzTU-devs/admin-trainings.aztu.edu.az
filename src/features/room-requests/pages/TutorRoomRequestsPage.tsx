import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus, CalendarX, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { DataTable } from "@shared/components/tables/DataTable";
import { ConfirmDialog } from "@shared/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/Dialog";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import { RoomRequestStatusBadge } from "@features/room-requests/components/RoomRequestStatusBadge";
import {
  BookingMobileRow,
  EndsCell,
  FeeCell,
  RoomCell,
  StartsCell,
} from "@features/room-requests/components/BookingCells";
import {
  useCancelRoomBookingMutation,
  useCreateRoomBookingMutation,
  useListMyRoomBookingsQuery,
} from "@features/room-requests/api/roomRequestsApi";
import type { RoomBookingDto } from "@features/room-requests/types";
import { BOOKING_STATUS } from "@shared/types/lms";
import {
  roomBookingSchema,
  type RoomBookingFormValues,
} from "@features/room-requests/schemas/roomRequest.schema";

/**
 * Tutors create room bookings (`POST /api/portal/room-bookings`), see their
 * history (`GET /api/portal/room-bookings/mine`) and cancel pending/approved
 * ones (`DELETE /api/portal/room-bookings/{id}`).
 */
export default function TutorRoomRequestsPage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [toCancel, setToCancel] = useState<RoomBookingDto | null>(null);

  const { data, isFetching } = useListMyRoomBookingsQuery({ page, size: 10 });
  const [createBooking] = useCreateRoomBookingMutation();
  const [cancelBooking] = useCancelRoomBookingMutation();

  const form = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingSchema),
    defaultValues: { roomId: "", offlineCourseId: "", startsAt: "", endsAt: "", recurrenceRule: "" },
  });

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  /** Pending and approved bookings can still be cancelled; the rest have no action. */
  const cancelAction = useCallback((b: RoomBookingDto) => {
    const cancellable = b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.APPROVED;
    if (!cancellable) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        // A calendar with a cross: this cancels the booking, it does not delete a record.
        leftIcon={<CalendarX className="size-4" />}
        onClick={(e) => {
          e.stopPropagation();
          setToCancel(b);
        }}
      >
        Cancel
      </Button>
    );
  }, []);

  const columns = useMemo<ColumnDef<RoomBookingDto>[]>(
    () => [
      { header: "Room", cell: ({ row }) => <RoomCell name={row.original.roomName} roomId={row.original.roomId} /> },
      { header: "Starts", cell: ({ row }) => <StartsCell booking={row.original} /> },
      { header: "Ends", cell: ({ row }) => <EndsCell booking={row.original} /> },
      { header: "Fee", cell: ({ row }) => <FeeCell booking={row.original} /> },
      { header: "Status", cell: ({ row }) => <RoomRequestStatusBadge status={row.original.status} /> },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => <div className="flex justify-end">{cancelAction(row.original)}</div>,
      },
    ],
    [cancelAction],
  );

  const bookings = data?.content ?? [];
  const pagination = data
    ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages }
    : undefined;

  return (
    <>
      <PageHeader
        title="Room bookings"
        description="Request a classroom for an offline session and track your bookings."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New booking
          </Button>
        }
      />

      {/* Below 768px DataTable shows each row as a card: the booking's
          tile, room, fee, status and time, with Cancel in reach. */}
      <DataTable<RoomBookingDto>
        data={bookings}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No bookings yet"
        emptyDescription="Request a classroom with the button above; an admin reviews it."
        pagination={pagination}
        onPageChange={setPage}
        getRowId={(row) => row.id}
        renderMobileRow={(b) => <BookingMobileRow booking={b} actions={cancelAction(b)} />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<CalendarPlus />}>
            <DialogTitle>New room booking</DialogTitle>
          </DialogHeader>
          <Form
            form={form}
            onSubmit={async (values) => {
              try {
                await createBooking({
                  roomId: values.roomId,
                  offlineCourseId: values.offlineCourseId || undefined,
                  startsAt: new Date(values.startsAt).toISOString(),
                  endsAt: new Date(values.endsAt).toISOString(),
                  recurrenceRule: values.recurrenceRule || undefined,
                }).unwrap();
                toast.success("Booking requested");
                form.reset();
                setOpen(false);
              } catch {
                toast.error("Could not submit booking");
              }
            }}
          >
            <FormSection title="">
              <FormField<RoomBookingFormValues> name="roomId" label="Room UUID" required>
                {({ field, invalid }) => <Input {...field} value={field.value as string} invalid={invalid} placeholder="room id" />}
              </FormField>
              <FormField<RoomBookingFormValues> name="offlineCourseId" label="Offline course UUID (optional)">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="startsAt" label="Starts at" required>
                {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="endsAt" label="Ends at" required>
                {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="recurrenceRule" label="Recurrence (RRULE, optional)" className="md:col-span-2">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} placeholder="FREQ=WEEKLY;COUNT=8" />}
              </FormField>
            </FormSection>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>Submit booking</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancel this booking?"
        description={toCancel ? `${toCancel.roomName} · ${fmt(toCancel.startsAt)}` : undefined}
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          if (!toCancel) return;
          try {
            await cancelBooking(toCancel.id).unwrap();
            toast.success("Booking cancelled");
            setToCancel(null);
          } catch {
            toast.error("Could not cancel booking");
          }
        }}
      />
    </>
  );
}
