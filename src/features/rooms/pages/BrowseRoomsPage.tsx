import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Users, MapPin } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
import { MediaImage } from "@shared/components/ui/MediaImage";
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
import { useListPortalRoomsQuery } from "@features/rooms/api/roomsApi";
import { useCreateRoomBookingMutation } from "@features/room-requests/api/roomRequestsApi";
import {
  roomBookingSchema,
  type RoomBookingFormValues,
} from "@features/room-requests/schemas/roomRequest.schema";
import type { RoomDto } from "@features/rooms/types";

export default function BrowseRoomsPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useListPortalRoomsQuery({ page, size: 12 });
  const [borrowRoom, setBorrowRoom] = useState<RoomDto | null>(null);
  const [createBooking] = useCreateRoomBookingMutation();

  const form = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingSchema),
    defaultValues: { roomId: "", offlineCourseId: "", startsAt: "", endsAt: "", recurrenceRule: "" },
  });

  const openBorrow = (room: RoomDto) => {
    form.reset({ roomId: room.id, offlineCourseId: "", startsAt: "", endsAt: "", recurrenceRule: "" });
    setBorrowRoom(room);
  };

  const rooms = data?.content ?? [];

  return (
    <>
      <PageHeader
        title="Browse rooms"
        description="Find an available classroom and request to borrow it for a session."
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rooms.length === 0 ? (
        <EmptyState title="No rooms available" description="Check back later — no rooms are currently available to borrow." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-gray-100 dark:bg-white/5">
                {room.imageMediaIds?.[0] ? (
                  <MediaImage mediaId={room.imageMediaIds[0]} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300">No image</div>
                )}
                <span className="absolute right-2 top-2 rounded-lg bg-gray-900/80 text-white text-sm font-semibold px-2.5 py-1">
                  {room.hourlyRate} {room.currency}/h
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{room.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3.5" />
                    {room.roomNumber}{room.building ? ` · ${room.building}` : ""}
                  </p>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="size-3.5" /> Capacity {room.capacity}
                </p>
                {room.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{room.description}</p>
                )}
                <Button className="mt-auto" onClick={() => openBorrow(room)}>
                  Request to borrow
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 self-center">Page {page + 1} of {data.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Dialog open={borrowRoom !== null} onOpenChange={(o) => !o && setBorrowRoom(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Request to borrow{borrowRoom ? ` · ${borrowRoom.name}` : ""}</DialogTitle>
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
                toast.success("Booking requested — an admin will review it");
                setBorrowRoom(null);
              } catch {
                toast.error("Could not request booking");
              }
            }}
          >
            <FormSection title="">
              <FormField<RoomBookingFormValues> name="startsAt" label="Starts at" required>
                {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="endsAt" label="Ends at" required>
                {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="offlineCourseId" label="Offline course ID" description="Optional — link this booking to one of your offline courses.">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
              <FormField<RoomBookingFormValues> name="recurrenceRule" label="Recurrence (RRULE)" description="Optional, e.g. FREQ=WEEKLY;COUNT=8">
                {({ field, invalid }) => <Input {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
              </FormField>
            </FormSection>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setBorrowRoom(null)}>Cancel</Button>
              <Button type="submit" loading={form.formState.isSubmitting}>Request</Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
