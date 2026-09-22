import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, DoorOpen, MapPin, Users } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Spinner } from "@shared/components/ui/Spinner";
import { EmptyState } from "@shared/components/feedback/EmptyState";
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
import { RoomVisual } from "@features/rooms/components/RoomVisual";
import { RoomStatusBadge } from "@features/rooms/components/RoomStatusBadge";
import { formatAmount } from "@features/rooms/lib/money";

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
        <EmptyState Icon={DoorOpen} title="No rooms available" description="Check back later — no rooms are currently available to borrow." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onBorrow={() => openBorrow(room)} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5 sm:justify-center">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ChevronLeft className="size-4" />}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="inline-flex h-9 items-center rounded-full bg-navy-tint px-3.5 text-[13px] font-semibold text-navy tabular-nums">
            Page {page + 1} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ChevronRight className="size-4" />}
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={borrowRoom !== null} onOpenChange={(o) => !o && setBorrowRoom(null)}>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogHeader icon={<CalendarPlus />}>
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

/**
 * One room as a catalogue card, like a course card on the website: the photo
 * (or the room's generated floor plan) inset at the top with its status on a
 * frosted pill, the name in Albert Sans, a meta row, and the rate beside the
 * one action.
 *
 * The action is a secondary pill, not navy: a grid of rooms would otherwise be
 * a dozen competing primaries, and navy is kept for a page's single action.
 * It takes the navy-tint wash while the card is hovered or holds focus, so the
 * card being looked at shows where to click.
 */
function RoomCard({ room, onBorrow }: { room: RoomDto; onBorrow: () => void }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] motion-reduce:hover:translate-y-0">
      <div className="p-2 pb-0">
        <RoomVisual room={room} className="aspect-[16/10] w-full rounded-[18px]">
          <div className="ov left-3 top-3">
            <RoomStatusBadge status={room.status} glass />
          </div>
        </RoomVisual>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5 pt-4">
        <h3 className="clamp-2 font-display text-[17px] font-bold leading-snug tracking-[-0.014em] text-ink">{room.name}</h3>
        <div className="meta">
          <span className="min-w-0 max-w-full">
            <MapPin aria-hidden />
            <span className="truncate">
              <span className="font-mono text-[12.5px]">{room.roomNumber}</span>
              {room.building ? ` · ${room.building}` : ""}
            </span>
          </span>
          <span>
            <Users aria-hidden /> Capacity {room.capacity}
          </span>
        </div>
        {room.description && <p className="clamp-2 text-sm leading-relaxed text-ink-2">{room.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="whitespace-nowrap text-ink-3">
            <span className="font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">
              {formatAmount(room.hourlyRate)} {room.currency}
            </span>
            <span className="text-[13px] font-medium">/h</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="group-focus-within:bg-navy-tint group-focus-within:text-navy group-hover:bg-navy-tint group-hover:text-navy"
            onClick={onBorrow}
          >
            Request to borrow
          </Button>
        </div>
      </div>
    </article>
  );
}
