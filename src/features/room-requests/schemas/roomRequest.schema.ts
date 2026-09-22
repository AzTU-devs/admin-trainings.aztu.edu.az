import { z } from "zod";

export const roomBookingSchema = z
  .object({
    roomId: z.string().uuid("Choose a room"),
    offlineCourseId: z.string().uuid().optional().or(z.literal("")),
    startsAt: z.string().min(1, "Start time required"),
    endsAt: z.string().min(1, "End time required"),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  })
  // The API wants both times in the future (@Future); say so before sending.
  .refine((v) => !v.startsAt || new Date(v.startsAt) > new Date(), {
    message: "Start time must be in the future",
    path: ["startsAt"],
  });

export type RoomBookingFormValues = z.infer<typeof roomBookingSchema>;
