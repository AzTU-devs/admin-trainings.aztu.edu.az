import { z } from "zod";
import { ROOM_STATUS } from "@shared/types/lms";

export const roomSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  roomNumber: z.string().min(1, "Room number is required").max(40),
  building: z.string().max(120).optional(),
  capacity: z.number().int().min(1, "Capacity ≥ 1"),
  description: z.string().max(2000).optional(),
  status: z.enum([
    ROOM_STATUS.AVAILABLE,
    ROOM_STATUS.MAINTENANCE,
    ROOM_STATUS.RESERVED,
    ROOM_STATUS.RETIRED,
  ]),
  hourlyRate: z.number().min(0, "Rate ≥ 0"),
  currency: z.string().length(3, "3-letter code"),
  imageMediaIds: z.array(z.string().uuid()).min(2, "At least 2 images are required"),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
