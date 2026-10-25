import { z } from "zod";
import { optionalUuid } from "@features/room-requests/schemas/roomBookingSeries.schema";

/*
 * A single booking: one start and one end. Repeating sessions are a long-term
 * booking (roomBookingSeries.schema.ts) — the API refuses an RRULE here with
 * RECURRENCE_NOT_SUPPORTED, so the form no longer offers one.
 */
export const roomBookingSchema = z
  .object({
    roomId: z.string().uuid("Pick a room"),
    offlineCourseId: optionalUuid("Enter a valid course ID, or leave it empty"),
    startsAt: z.string().min(1, "Start time required"),
    endsAt: z.string().min(1, "End time required"),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });

export type RoomBookingFormValues = z.infer<typeof roomBookingSchema>;
