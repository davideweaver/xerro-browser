import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  isToday,
  isYesterday,
  isTomorrow,
  parseISO,
  startOfDay,
  endOfDay,
  formatISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { calendarService } from "@/api/calendarService";
import { CalendarEventSheet } from "@/components/calendar/CalendarEventSheet";
import type { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { getCalendarColor } from "@/lib/calendarColors";

// Diagonal stripe overlay for tentative (maybe) events
const TENTATIVE_STRIPE =
  "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.18) 4px, rgba(0,0,0,0.18) 7px)";

// ─── Overlap layout ──────────────────────────────────────────────────────────

interface LayoutEvent {
  event: CalendarEvent;
  col: number;
  totalCols: number;
}

function layoutEvents(events: CalendarEvent[]): LayoutEvent[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  // Each column tracks the end time of the last event placed in it
  const colEnds: number[] = [];
  const assignments: { event: CalendarEvent; col: number }[] = [];

  for (const event of sorted) {
    const start = new Date(event.startDate).getTime();
    let placed = false;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= start) {
        colEnds[c] = new Date(event.endDate).getTime();
        assignments.push({ event, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      assignments.push({ event, col: colEnds.length });
      colEnds.push(new Date(event.endDate).getTime());
    }
  }

  const totalCols = colEnds.length || 1;
  return assignments.map((a) => ({ ...a, totalCols }));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 0; // render from midnight
const END_HOUR = 24;
const GUTTER_WIDTH = 56; // left time label column

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  events,
  date,
  onEventClick,
}: {
  events: CalendarEvent[];
  date: Date;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  // Scroll to show ~1 hour before current time (or 7am)
  useEffect(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (isToday(date)) {
      setNowMinutes(mins);
      const scrollTo = Math.max(0, (mins / 60 - 1) * HOUR_HEIGHT);
      scrollRef.current?.scrollTo({ top: scrollTo, behavior: "smooth" });
    } else {
      setNowMinutes(null);
      scrollRef.current?.scrollTo({ top: 7 * HOUR_HEIGHT });
    }
  }, [date]);

  // Refresh "now" line every minute
  useEffect(() => {
    if (!isToday(date)) return;
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [date]);

  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events.filter((e) => !e.isAllDay);
  const laid = layoutEvents(timedEvents);
  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* All-day band */}
      {allDayEvents.length > 0 && (
        <div className="flex-shrink-0 border-b border-border pb-2 pt-1 px-2 space-y-1">
          {allDayEvents.map((ev) => {
            const color = getCalendarColor(ev.calendar);
            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium truncate cursor-pointer",
                  color.bg,
                  color.text,
                )}
                style={
                  ev.participationStatus === 4
                    ? { backgroundImage: TENTATIVE_STRIPE }
                    : undefined
                }
              >
                {ev.title}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: totalGridHeight }}>
          {/* Hour lines + labels */}
          {Array.from(
            { length: END_HOUR - START_HOUR + 1 },
            (_, i) => i + START_HOUR,
          ).map((hour) => {
            const top = (hour - START_HOUR) * HOUR_HEIGHT;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top }}
              >
                <div
                  className="flex-shrink-0 flex items-start justify-end pr-3 text-[11px] text-muted-foreground select-none"
                  style={{ width: GUTTER_WIDTH, marginTop: -8 }}
                >
                  {hour > 0 && hour < 24
                    ? hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour - 12} PM`
                    : ""}
                </div>
                <div className="flex-1 border-t border-border/40" />
              </div>
            );
          })}

          {/* Current time indicator */}
          {isToday(date) && nowMinutes !== null && (
            <div
              className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
              style={{
                top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT,
              }}
            >
              <div
                style={{ width: GUTTER_WIDTH }}
                className="flex justify-end pr-2"
              >
                <div className="h-2 w-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}

          {/* Timed events */}
          {laid.map(({ event, col, totalCols }) => {
            const startMins =
              new Date(event.startDate).getHours() * 60 +
              new Date(event.startDate).getMinutes();
            const endMins =
              new Date(event.endDate).getHours() * 60 +
              new Date(event.endDate).getMinutes();
            const durationMins = Math.max(endMins - startMins, 15);
            const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const height = (durationMins / 60) * HOUR_HEIGHT;
            const color = getCalendarColor(event.calendar);

            const startLabel = format(parseISO(event.startDate), "h:mm a")
              .replace(":00", "")
              .toLowerCase();
            const endLabel = format(parseISO(event.endDate), "h:mm a")
              .replace(":00", "")
              .toLowerCase();

            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "absolute rounded-sm px-1.5 py-0.5 text-xs overflow-hidden border-l-2 cursor-pointer select-none",
                  color.bg,
                  color.border,
                  color.text,
                )}
                style={{
                  top: top + 1,
                  height: Math.max(height - 2, 20),
                  left: `calc(${GUTTER_WIDTH}px + ${(col / totalCols) * 100}% - ${(col / totalCols) * GUTTER_WIDTH}px)`,
                  width: `calc(${(1 / totalCols) * 100}% - ${GUTTER_WIDTH / totalCols}px - 4px)`,
                  ...(event.participationStatus === 4 && {
                    backgroundImage: TENTATIVE_STRIPE,
                  }),
                }}
                title={`${event.title} — ${startLabel}–${endLabel}${event.location ? `\n${event.location}` : ""}`}
              >
                <div className="font-semibold leading-tight truncate">
                  {event.title}
                </div>
                {height > 28 && (
                  <div className="opacity-90 leading-tight">
                    {startLabel}–{endLabel}
                  </div>
                )}
                {height > 48 && event.location && (
                  <div className="opacity-75 truncate text-[10px]">
                    {event.location}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events
    .filter((e) => !e.isAllDay)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No events
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allDayEvents.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">
            All Day
          </div>
          {allDayEvents.map((ev) => {
            const color = getCalendarColor(ev.calendar);
            const isTentative = ev.participationStatus === 4;
            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-accent/50 cursor-pointer"
              >
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full flex-shrink-0",
                    color.dot,
                    isTentative && "opacity-50",
                  )}
                />
                <span className="flex-1 text-sm font-medium">{ev.title}</span>
                <span className="text-xs text-muted-foreground">
                  {ev.calendar}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {timedEvents.map((ev) => {
        const color = getCalendarColor(ev.calendar);
        const isTentative = ev.participationStatus === 4;
        const startLabel = format(parseISO(ev.startDate), "h:mm a")
          .replace(":00 ", " ")
          .toLowerCase();
        const endLabel = format(parseISO(ev.endDate), "h:mm a")
          .replace(":00 ", " ")
          .toLowerCase();
        return (
          <div
            key={ev.id}
            onClick={() => onEventClick(ev)}
            className="flex items-start gap-3 px-1 py-2 rounded-lg hover:bg-accent/50 cursor-pointer"
          >
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5",
                color.dot,
                isTentative && "opacity-50",
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{ev.title}</div>
              <div className="text-xs text-muted-foreground">
                {startLabel} – {endLabel}
                {ev.location && (
                  <span className="ml-2 opacity-75">· {ev.location}</span>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {ev.calendar}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "day" | "list";

function getStoredViewMode(): ViewMode {
  const stored = localStorage.getItem("calendar-view-mode");
  return stored === "list" || stored === "day" ? stored : "day";
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const title = format(selectedDate, "EEEE, MMM d");

  const datePrefix = isToday(selectedDate)
    ? "Today"
    : isTomorrow(selectedDate)
      ? "Tomorrow"
      : isYesterday(selectedDate)
        ? "Yesterday"
        : null;

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-events", dateStr],
    queryFn: () =>
      calendarService.getEvents(
        formatISO(startOfDay(selectedDate)),
        formatISO(endOfDay(selectedDate)),
      ),
  });

  const events = data?.events ?? [];

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("calendar-view-mode", mode);
  };

  const goToToday = () => setSelectedDate(new Date());

  return (
    <Container
      title={title}
      content="fixed"
      description={`${datePrefix ? `${datePrefix} · ` : ""}${events.length} event${events.length !== 1 ? "s" : ""}`}
      tools={
        <div className="flex items-center gap-2">
          <ContainerToolToggle
            pressed={!isToday(selectedDate)}
            onPressedChange={() => goToToday()}
            title="Go to today"
          >
            <span className={`text-xs font-semibold px-0.5 ${!isToday(selectedDate) ? "" : "opacity-40"}`}>Today</span>
          </ContainerToolToggle>
          <ContainerToolButton
            size="icon"
            title="Previous day"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </ContainerToolButton>
          <ContainerToolButton
            size="icon"
            title="Next day"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </ContainerToolButton>
          <ContainerToolToggle
            pressed={viewMode === "list"}
            onPressedChange={(on) => handleViewMode(on ? "list" : "day")}
            title={viewMode === "list" ? "Switch to day view" : "Switch to list view"}
          >
            <List
              strokeWidth={viewMode === "list" ? 2.5 : 1.5}
              className={viewMode === "list" ? undefined : "opacity-40"}
            />
          </ContainerToolToggle>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : viewMode === "day" ? (
        <DayView events={events} date={selectedDate} onEventClick={setSelectedEvent} />
      ) : (
        <ListView events={events} onEventClick={setSelectedEvent} />
      )}
      <CalendarEventSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </Container>
  );
}
