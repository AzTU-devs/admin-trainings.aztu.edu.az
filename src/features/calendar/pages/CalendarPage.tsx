import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import FullCalendar, {
  type CalendarRef,
  type DateClickInfo,
  type DatesSetInfo,
  type EventClickInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import interactionPlugin from "@fullcalendar/react/interaction";
import monarchTheme from "@fullcalendar/react/themes/monarch";
import enGbLocale from "@fullcalendar/react/locales/en-gb";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/monarch/theme.css";
import "@features/calendar/styles/calendar.css";
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Globe,
  RotateCw,
} from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Button } from "@shared/components/ui/Button";
import { Card } from "@shared/components/ui/Card";
import { Spinner } from "@shared/components/ui/Spinner";
import { ROUTES } from "@shared/constants/routes";
import type { NormalizedError } from "@lib/axios/httpClient";
import { useGetAdminCalendarQuery } from "@features/calendar/api/calendarApi";
import { CalendarEventDialog } from "@features/calendar/components/CalendarEventDialog";
import { CalendarLegend } from "@features/calendar/components/KindBadge";
import {
  PLATFORM_TIME_ZONE,
  addDays,
  rangeFromView,
  toCalendarEvents,
  zoneOffsetLabel,
  type CalendarEventProps,
} from "@features/calendar/lib/calendarEvents";
import type { CalendarEventDto, CalendarRange } from "@features/calendar/types";

/** The four views, as the switcher names them and FullCalendar knows them. */
const VIEWS = [
  { key: "month", label: "Month", type: "dayGridMonth" },
  { key: "week", label: "Week", type: "timeGridWeek" },
  { key: "day", label: "Day", type: "timeGridDay" },
  { key: "list", label: "List", type: "listMonth" },
] as const;

type ViewType = (typeof VIEWS)[number]["type"];

const TIME_FORMAT = { hour: "2-digit", minute: "2-digit", hour12: false } as const;

/** "2 Nov 2026" for a local date, for the empty-period note. */
function shortDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Super-admin training calendar: every one-time training, course session,
 * course span and room booking on the platform, by month, week, day or as an
 * agenda. Each visible range is fetched from `GET /api/admin/calendar` as the
 * calendar moves, and an entry opens its full details.
 *
 * The grid runs in the platform zone (Asia/Baku) whatever the browser's zone
 * is, so the times match what participants were told.
 */
export default function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef<CalendarRef>(null);
  const [viewType, setViewType] = useState<ViewType>("dayGridMonth");
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<CalendarRange | null>(null);
  const [selected, setSelected] = useState<CalendarEventDto | null>(null);

  // `currentData`, not `data`: after a move the previous range's events must
  // not linger on the new one while it loads.
  const { currentData, isFetching, isError, error, refetch } = useGetAdminCalendarQuery(
    range ?? { from: "", to: "" },
    {
      skip: !range,
      refetchOnMountOrArgChange: 60,
    },
  );

  const timeZone = currentData?.timezone ?? PLATFORM_TIME_ZONE;
  const events = useMemo(
    () => toCalendarEvents(currentData?.events ?? [], timeZone),
    [currentData, timeZone],
  );
  const offset = zoneOffsetLabel(timeZone);
  const timeGrid = viewType.startsWith("timeGrid");

  const api = () => calendarRef.current?.getApi();

  const onDatesSet = useCallback((info: DatesSetInfo) => {
    setTitle(info.view.title);
    setViewType(info.view.type as ViewType);
    const next = rangeFromView(info.startStr, info.endStr);
    setRange((prev) => (prev && prev.from === next.from && prev.to === next.to ? prev : next));
  }, []);

  const onEventClick = useCallback((info: EventClickInfo) => {
    info.jsEvent.preventDefault();
    const { dto } = info.event.extendedProps as CalendarEventProps;
    if (dto) setSelected(dto);
  }, []);

  // A click on an empty day in the month grid opens that day, as a date
  // number does (navLinks); the time grids have nothing to create.
  const onDateClick = useCallback((info: DateClickInfo) => {
    if (info.view.type === "dayGridMonth")
      info.view.calendar.changeView("timeGridDay", info.dateStr);
  }, []);

  const newOneTime = () => navigate(ROUTES.adminCourseNewOneTime);
  const loadError = isError ? (error as NormalizedError | undefined) : undefined;
  const empty = !isFetching && !isError && !!currentData && currentData.events.length === 0;

  return (
    <>
      <PageHeader
        title="Training calendar"
        description="Every training on the platform, day by day: one-time trainings, course sessions, courses and room bookings. Click an entry for its details."
        actions={
          <Button leftIcon={<CalendarPlus className="size-4" />} onClick={newOneTime}>
            New one-time training
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {/* Toolbar: the dashboard's own controls drive the grid, so it reads
            like the rest of the app rather than like a widget. */}
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => api()?.today()}>
              Today
            </Button>
            <div className="flex items-center">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous"
                onClick={() => api()?.prev()}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Next" onClick={() => api()?.next()}>
                <ChevronRight className="size-5" />
              </Button>
            </div>
            <h2
              aria-live="polite"
              className="min-w-0 font-display text-[19px] font-bold tracking-[-0.018em] text-ink"
            >
              {title}
            </h2>
            {isFetching && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3"
              >
                <Spinner size={4} />
                Loading…
              </span>
            )}
          </div>
          <div className="seg" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={viewType === v.type}
                onClick={() => api()?.changeView(v.type)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-line px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <CalendarLegend />
          <p className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
            <Globe aria-hidden className="size-3.5 text-ink-3" />
            Times in {timeZone}
            {offset ? ` (${offset})` : ""}
          </p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 bg-danger-tint px-4 py-3 text-sm text-danger sm:px-5"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle aria-hidden className="size-4" />
              {loadError.status === 403
                ? "Your account cannot view the training calendar."
                : loadError.message || "Could not load the calendar."}
            </span>
            {loadError.status !== 403 && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<RotateCw className="size-4" />}
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {currentData?.truncated && (
          <div
            role="status"
            className="flex items-center gap-2 bg-warn-tint px-4 py-3 text-sm text-warn sm:px-5"
          >
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            This period has more entries than the calendar can show at once, so only the first ones
            are drawn. Switch to the week or day view to see them all.
          </div>
        )}

        {empty && range && (
          <p className="border-b border-line px-4 py-2.5 text-[13px] text-ink-3 sm:px-5">
            Nothing is scheduled between {shortDay(range.from)} and{" "}
            {shortDay(addDays(range.to, -1))}.
          </p>
        )}

        {/* Edge to edge: the card is the frame, so the grid draws no border of its own. */}
        <div className="aztu-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, monarchTheme]}
            initialView="dayGridMonth"
            timeZone={timeZone}
            locale={enGbLocale}
            headerToolbar={false}
            borderless
            events={events}
            datesSet={onDatesSet}
            eventClick={onEventClick}
            dateClick={onDateClick}
            eventInteractive
            navLinks
            // A day number opens the timed day view, the one the switcher calls "Day".
            navLinkDayClick="timeGridDay"
            nowIndicator
            // A busy day in the month grid folds into "+N more" past four entries.
            dayMaxEvents={4}
            allDayText="All day"
            noEventsText="Nothing scheduled in this period."
            eventTimeFormat={TIME_FORMAT}
            slotHeaderFormat={TIME_FORMAT}
            scrollTime="08:00:00"
            // A month or an agenda grows with its content; the time grids
            // scroll inside a fixed frame, opened at 08:00.
            height={timeGrid ? 720 : "auto"}
          />
        </div>
      </Card>

      <CalendarEventDialog
        event={selected}
        timeZone={timeZone}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
