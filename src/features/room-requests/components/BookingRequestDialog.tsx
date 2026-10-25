import { useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, CalendarPlus, Repeat } from "lucide-react";
import type { NormalizedError } from "@lib/axios/httpClient";
import { Button } from "@shared/components/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/Dialog";
import { Form, FormSection } from "@shared/components/forms/Form";
import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import { Label } from "@shared/components/ui/Label";
import { Textarea } from "@shared/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/Tabs";
import { Notice } from "@features/user-profile/components/ProfileBits";
import { useListPortalRoomsQuery } from "@features/rooms/api/roomsApi";
import type { RoomDto } from "@features/rooms/types";
import {
  useCreateRoomBookingMutation,
  useCreateRoomBookingSeriesMutation,
} from "@features/room-requests/api/roomRequestsApi";
import { roomBookingSchema, type RoomBookingFormValues } from "@features/room-requests/schemas/roomRequest.schema";
import {
  SERIES_NOTE_MAX,
  emptySeriesValues,
  roomBookingSeriesSchema,
  toSeriesRequest,
  type RoomBookingSeriesFormValues,
} from "@features/room-requests/schemas/roomBookingSeries.schema";
import { MAX_SERIES_OCCURRENCES, occurrenceDates, todayIn } from "@features/room-requests/lib/series";
import { describeSeriesCreateError } from "@features/room-requests/lib/bookingErrors";
import { SeriesPreview } from "@features/room-requests/components/SeriesPreview";
import { WeekdayPicker } from "@features/room-requests/components/WeekdayPicker";

export type BookingMode = "single" | "series";

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The room being borrowed (Browse rooms). Left out, the dialog starts with a
   * room picker over the rooms open for booking (My room requests).
   */
  room?: RoomDto | null;
  initialMode?: BookingMode;
}

/**
 * A tutor's request for a room: one session, or a long-term booking — the
 * same hours on chosen weekdays over a period, which an admin approves or
 * rejects as a whole. The choice is the dialog's first control (the `.seg`
 * track the status filters use), and each kind keeps its own form, so
 * switching back and forth loses nothing typed.
 */
export function BookingRequestDialog({ open, onOpenChange, room, initialMode = "single" }: BookingRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted only while open: every request starts from empty forms. */}
      {open && <BookingRequestPanel room={room ?? null} initialMode={initialMode} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function BookingRequestPanel({
  room,
  initialMode,
  onClose,
}: {
  room: RoomDto | null;
  initialMode: BookingMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<BookingMode>(initialMode);
  const [pickedRoomId, setPickedRoomId] = useState("");
  const roomId = room?.id ?? pickedRoomId;

  const { data: roomsPage, isLoading: roomsLoading } = useListPortalRoomsQuery({ page: 0, size: 100 }, { skip: !!room });
  const rooms = roomsPage?.content ?? [];
  const activeRoom = room ?? rooms.find((r) => r.id === pickedRoomId) ?? null;

  const singleForm = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingSchema),
    defaultValues: { roomId, offlineCourseId: "", startsAt: "", endsAt: "" },
  });
  const seriesForm = useForm<RoomBookingSeriesFormValues>({
    resolver: zodResolver(roomBookingSeriesSchema),
    defaultValues: emptySeriesValues(roomId),
  });

  // Both forms hold the room, so a room picked before switching kinds stays picked.
  const pickRoom = (id: string) => {
    setPickedRoomId(id);
    singleForm.setValue("roomId", id, { shouldValidate: singleForm.formState.isSubmitted });
    seriesForm.setValue("roomId", id, { shouldValidate: seriesForm.formState.isSubmitted });
  };
  const roomError =
    mode === "single" ? singleForm.formState.errors.roomId?.message : seriesForm.formState.errors.roomId?.message;

  return (
    <DialogContent size="lg" aria-describedby={undefined}>
      <DialogHeader icon={<CalendarPlus />}>
        <DialogTitle>{room ? `Request to borrow · ${room.name}` : "New room booking"}</DialogTitle>
      </DialogHeader>

      {!room && (
        <div className="mb-5">
          <Label htmlFor="booking-room" required>
            Room
          </Label>
          <Select value={pickedRoomId} onValueChange={pickRoom}>
            <SelectTrigger id="booking-room" invalid={!!roomError}>
              <SelectValue placeholder={roomsLoading ? "Loading rooms…" : "Select a room"} />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {r.roomNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roomError && <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-danger">{roomError}</p>}
        </div>
      )}

      <Tabs value={mode} onValueChange={(v) => setMode(v as BookingMode)}>
        <TabsList aria-label="Booking type" className="flex w-full">
          {/* Icons from sm: on a phone both labels only just fit one row. */}
          <TabsTrigger value="single" className="flex-1">
            <CalendarClock aria-hidden className="hidden size-4 sm:block" />
            Single booking
          </TabsTrigger>
          <TabsTrigger value="series" className="flex-1">
            <Repeat aria-hidden className="hidden size-4 sm:block" />
            Long-term (repeating)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="single">
          <SingleBookingForm form={singleForm} onCancel={onClose} onDone={onClose} />
        </TabsContent>
        <TabsContent value="series">
          <SeriesBookingForm form={seriesForm} room={activeRoom} onCancel={onClose} onDone={onClose} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function SingleBookingForm({
  form,
  onCancel,
  onDone,
}: {
  form: UseFormReturn<RoomBookingFormValues>;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [createBooking] = useCreateRoomBookingMutation();
  return (
    <Form
      form={form}
      onSubmit={async (values) => {
        try {
          await createBooking({
            roomId: values.roomId,
            offlineCourseId: values.offlineCourseId?.trim() || undefined,
            startsAt: new Date(values.startsAt).toISOString(),
            endsAt: new Date(values.endsAt).toISOString(),
          }).unwrap();
          toast.success("Booking requested — an admin will review it");
          onDone();
        } catch (e) {
          toast.error((e as NormalizedError).message || "Could not request booking");
        }
      }}
    >
      <FormSection description="One session in the room, from a start to an end.">
        <FormField<RoomBookingFormValues> name="startsAt" label="Starts at" required>
          {({ field, invalid, id }) => (
            <Input id={id} type="datetime-local" {...field} value={field.value as string} invalid={invalid} />
          )}
        </FormField>
        <FormField<RoomBookingFormValues> name="endsAt" label="Ends at" required>
          {({ field, invalid, id }) => (
            <Input id={id} type="datetime-local" {...field} value={field.value as string} invalid={invalid} />
          )}
        </FormField>
        <FormField<RoomBookingFormValues>
          name="offlineCourseId"
          label="Offline course ID"
          description="Optional — link this booking to one of your offline courses."
          className="md:col-span-2"
        >
          {({ field, invalid, id }) => <Input id={id} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
      </FormSection>
      <DialogFooter>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Request
        </Button>
      </DialogFooter>
    </Form>
  );
}

function SeriesBookingForm({
  form,
  room,
  onCancel,
  onDone,
}: {
  form: UseFormReturn<RoomBookingSeriesFormValues>;
  room: RoomDto | null;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [createSeries] = useCreateRoomBookingSeriesMutation();
  // The ROOM_BOOKING_CONFLICT message lists the clashing dates: kept on screen
  // (a toast would be gone before the dates are read) until the next try.
  const [conflict, setConflict] = useState<string | null>(null);

  const [startDate, endDate, daysOfWeek, startTime, endTime, note] = useWatch({
    control: form.control,
    name: ["startDate", "endDate", "daysOfWeek", "startTime", "endTime", "note"],
  });
  const today = todayIn();
  const dates = daysOfWeek.length ? occurrenceDates({ startDate, endDate, daysOfWeek }) : null;
  const count = dates?.length ?? 0;
  const noteLength = note?.length ?? 0;

  return (
    <Form
      form={form}
      onSubmit={async (values) => {
        setConflict(null);
        try {
          const created = await createSeries(toSeriesRequest(values)).unwrap();
          const sessions = created?.occurrenceCount ?? count;
          toast.success(`Long-term booking requested: ${sessions} ${sessions === 1 ? "session" : "sessions"}. An admin will review it.`);
          onDone();
        } catch (e) {
          const outcome = describeSeriesCreateError(e);
          if (outcome.field) form.setError(outcome.field.name, { message: outcome.field.message }, { shouldFocus: true });
          if (outcome.conflict) setConflict(outcome.conflict);
          toast.error(outcome.toast);
        }
      }}
    >
      <FormSection description="The same hours on chosen weekdays over a period of up to a year. An admin approves or rejects the whole series at once.">
        <FormField<RoomBookingSeriesFormValues> name="startDate" label="Start date" required>
          {({ field, invalid, id }) => (
            <Input id={id} type="date" min={today} {...field} value={field.value as string} invalid={invalid} />
          )}
        </FormField>
        <FormField<RoomBookingSeriesFormValues> name="endDate" label="End date" required>
          {({ field, invalid, id }) => (
            <Input
              id={id}
              type="date"
              min={startDate || today}
              {...field}
              value={field.value as string}
              invalid={invalid}
            />
          )}
        </FormField>
        <FormField<RoomBookingSeriesFormValues> name="daysOfWeek" label="Weekdays" required className="md:col-span-2">
          {({ field, invalid, id }) => (
            <WeekdayPicker
              id={id}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={invalid}
            />
          )}
        </FormField>
        <FormField<RoomBookingSeriesFormValues> name="startTime" label="Start time (Baku time)" required>
          {({ field, invalid, id }) => (
            <Input id={id} type="time" {...field} value={field.value as string} invalid={invalid} />
          )}
        </FormField>
        <FormField<RoomBookingSeriesFormValues> name="endTime" label="End time (Baku time)" required>
          {({ field, invalid, id }) => (
            <Input id={id} type="time" {...field} value={field.value as string} invalid={invalid} />
          )}
        </FormField>
        <div className="md:col-span-2">
          <SeriesPreview
            pattern={{ startDate, endDate, daysOfWeek, startTime, endTime }}
            hourlyRate={room?.hourlyRate}
            currency={room?.currency}
          />
        </div>
        <FormField<RoomBookingSeriesFormValues>
          name="offlineCourseId"
          label="Offline course ID"
          description="Optional — link these sessions to one of your offline courses."
          className="md:col-span-2"
        >
          {({ field, invalid, id }) => <Input id={id} {...field} value={(field.value as string) ?? ""} invalid={invalid} />}
        </FormField>
        <FormField<RoomBookingSeriesFormValues>
          name="note"
          label="Note for the reviewer"
          description={`Optional · ${noteLength}/${SERIES_NOTE_MAX}`}
          className="md:col-span-2"
        >
          {({ field, invalid, id }) => (
            <Textarea
              id={id}
              rows={3}
              {...field}
              value={(field.value as string) ?? ""}
              invalid={invalid}
              placeholder="e.g. Python course, group B"
            />
          )}
        </FormField>
      </FormSection>

      {conflict && (
        <Notice tone="danger" Icon={AlertTriangle} title="Some sessions clash with approved bookings">
          <p className="whitespace-pre-line">{conflict}</p>
          <p className="mt-1">Change the dates, weekdays or times and send the request again.</p>
        </Notice>
      )}

      <DialogFooter>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {count > 0 && count <= MAX_SERIES_OCCURRENCES
            ? `Request ${count} ${count === 1 ? "session" : "sessions"}`
            : "Request"}
        </Button>
      </DialogFooter>
    </Form>
  );
}
