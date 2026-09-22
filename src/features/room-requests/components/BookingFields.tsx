import { FormField } from "@shared/components/forms/FormField";
import { Input } from "@shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/Select";
import { useListPortalRoomsQuery } from "@features/rooms/api/roomsApi";
import { useListMyCoursesQuery } from "@features/courses/api/coursesApi";
import { COURSE_STATUS, COURSE_TYPE } from "@shared/types/lms";
import type { RoomBookingFormValues } from "@features/room-requests/schemas/roomRequest.schema";

/** Radix Select cannot use "" as an item value, so "no course" gets a sentinel. */
const NO_COURSE = "__none__";

/**
 * The fields of a room booking request, shared by "New booking" and the
 * Browse rooms "Request to borrow" dialog.
 *
 * The room and the course are chosen from lists. Both used to be raw UUID text
 * boxes — ids no screen displays (course URLs use slugs) — and there was an RRULE
 * box for recurrences the API refuses outright.
 */
export function BookingFields({ showRoom = true }: { showRoom?: boolean }) {
  const { data: rooms, isLoading: roomsLoading, isError: roomsFailed } = useListPortalRoomsQuery(
    { size: 100 },
    { skip: !showRoom },
  );
  const roomList = rooms?.content ?? [];
  // An empty picker that just says "Choose a room" reads as broken; say why it is empty.
  const roomPlaceholder = roomsLoading
    ? "Loading rooms…"
    : roomsFailed
      ? "Couldn't load the rooms — close and try again"
      : roomList.length === 0
        ? "No rooms are available to book"
        : "Choose a room";
  const { data: courses } = useListMyCoursesQuery({ size: 100 });
  const offlineCourses = (courses?.content ?? []).filter(
    (c) => c.courseType === COURSE_TYPE.OFFLINE && c.status !== COURSE_STATUS.ARCHIVED,
  );

  return (
    <>
      {showRoom && (
        <FormField<RoomBookingFormValues> name="roomId" label="Room" required className="md:col-span-2">
          {({ field, invalid }) => (
            <Select value={field.value as string} onValueChange={field.onChange}>
              <SelectTrigger invalid={invalid} disabled={roomList.length === 0}>
                <SelectValue placeholder={roomPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {roomList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.roomNumber} · {r.hourlyRate} {r.currency}/h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}
      <FormField<RoomBookingFormValues> name="startsAt" label="Starts at" required>
        {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
      </FormField>
      <FormField<RoomBookingFormValues> name="endsAt" label="Ends at" required>
        {({ field, invalid }) => <Input type="datetime-local" {...field} value={field.value as string} invalid={invalid} />}
      </FormField>
      <FormField<RoomBookingFormValues>
        name="offlineCourseId"
        label="For course"
        description="Optional — link the booking to one of your in-person courses."
        className="md:col-span-2"
      >
        {({ field, invalid }) => (
          <Select
            value={(field.value as string) || NO_COURSE}
            onValueChange={(v) => field.onChange(v === NO_COURSE ? "" : v)}
          >
            <SelectTrigger invalid={invalid}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COURSE}>No course</SelectItem>
              {offlineCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <p className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
        Recurring sessions aren't supported yet — request each session separately.
      </p>
    </>
  );
}
