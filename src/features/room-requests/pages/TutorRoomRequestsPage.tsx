import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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

  const columns = useMemo<ColumnDef<RoomBookingDto>[]>(
    () => [
      {
        header: "Room",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">{row.original.roomName}</span>
        ),
      },
      { header: "Starts", cell: ({ row }) => <span className="text-sm">{fmt(row.original.startsAt)}</span> },
      { header: "Ends", cell: ({ row }) => <span className="text-sm">{fmt(row.original.endsAt)}</span> },
      {
        header: "Fee",
        cell: ({ row }) => `${row.original.totalFee} ${row.original.currency}`,
      },
      { header: "Status", cell: ({ row }) => <RoomRequestStatusBadge status={row.original.status} /> },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => {
          const cancellable =
            row.original.status === BOOKING_STATUS.PENDING ||
            row.original.status === BOOKING_STATUS.APPROVED;
          if (!cancellable) return null;
          return (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="size-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setToCancel(row.original);
              }}
            >
              Cancel
            </Button>
          );
        },
      },
    ],
    [],
  );

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

      <DataTable<RoomBookingDto>
        data={data?.content ?? []}
        columns={columns}
        isLoading={isFetching}
        emptyTitle="No bookings yet"
        emptyDescription="Request a classroom with the button above; an admin reviews it."
        pagination={data ? { page: data.page, size: data.size, totalElements: data.totalElements, totalPages: data.totalPages } : undefined}
        onPageChange={setPage}
        getRowId={(row) => row.id}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
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
