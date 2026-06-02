import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card, CardContent } from "@shared/components/ui/Card";
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
import { useCreateRoomBookingMutation } from "@features/room-requests/api/roomRequestsApi";
import {
  roomBookingSchema,
  type RoomBookingFormValues,
} from "@features/room-requests/schemas/roomRequest.schema";

/**
 * Tutors can CREATE a room booking (`POST /api/portal/room-bookings`).
 * There's no "list my bookings" or "cancel" endpoint yet — see GAP_REPORT.md.
 */
export default function TutorRoomRequestsPage() {
  const [open, setOpen] = useState(false);
  const [createBooking] = useCreateRoomBookingMutation();

  const form = useForm<RoomBookingFormValues>({
    resolver: zodResolver(roomBookingSchema),
    defaultValues: { roomId: "", offlineCourseId: "", startsAt: "", endsAt: "", recurrenceRule: "" },
  });

  return (
    <>
      <PageHeader
        title="Room bookings"
        description="Request a classroom for an offline session."
        actions={
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New booking
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <EmptyState
            title="Your booking history isn't available yet"
            description="The backend exposes booking creation and the admin queue, but no per-tutor booking list. Create a booking with the button above; an admin reviews it. (Listing endpoint is in the gap report.)"
          />
        </CardContent>
      </Card>

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
    </>
  );
}
