import { CalendarClock, MapPin, MonitorPlay } from "lucide-react";
import { COURSE_TYPE, type CourseType } from "@shared/types/lms";

/** One icon per course type: a screen, a pin, and a dated clock for a one-off session. */
export const COURSE_TYPE_ICON: Record<CourseType, typeof MapPin> = {
  [COURSE_TYPE.ONLINE]: MonitorPlay,
  [COURSE_TYPE.OFFLINE]: MapPin,
  [COURSE_TYPE.ONE_TIME]: CalendarClock,
};
