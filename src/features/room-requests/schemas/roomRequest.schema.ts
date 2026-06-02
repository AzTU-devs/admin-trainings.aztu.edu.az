import { z } from "zod";

export const roomBookingSchema = z
  .object({
    roomId: z.string().uuid("Room UUID required"),
    offlineCourseId: z.string().uuid().optional().or(z.literal("")),
    startsAt: z.string().min(1, "Start time required"),
    endsAt: z.string().min(1, "End time required"),
    recurrenceRule: z.string().max(255).optional(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });

export type RoomBookingFormValues = z.infer<typeof roomBookingSchema>;
