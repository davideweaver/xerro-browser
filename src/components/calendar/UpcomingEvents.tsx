import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  format,
  formatISO,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import { calendarService } from "@/api/calendarService";
import { getCalendarColor } from "@/lib/calendarColors";
import { cn } from "@/lib/utils";
import { CalendarEventSheet } from "@/components/calendar/CalendarEventSheet";
import type { CalendarEvent } from "@/types/calendar";

const MAX_UPCOMING = 4;

function fmtRelative(mins: number): string {
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(date: Date): string {
  return format(date, "h:mm a").replace(":00 ", " ").toLowerCase();
}

function CurrentEventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const now = new Date();
  const progress = Math.min(
    100,
    Math.max(
      0,
      ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100,
    ),
  );
  const minsLeft = Math.max(0, differenceInMinutes(end, now));
  const isTentative = event.participationStatus === 4;
  const circumference = 2 * Math.PI * 10;
  const strokeOffset = circumference * (1 - progress / 100);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-r-lg bg-accent/40 pl-2.5 pr-3 py-2.5 mb-1 border-l-[3px] border-red-500 hover:bg-accent/60 transition-colors cursor-pointer",
        isTentative && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Now
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              · {minsLeft > 0 ? `${fmtRelative(minsLeft)} left` : "ending soon"}
            </span>
          </div>
          <div className="font-semibold text-sm leading-snug truncate">{event.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {fmtTime(start)} – {fmtTime(end)}
            {event.location && (
              <span className="ml-1.5 opacity-70">· {event.location}</span>
            )}
          </div>
        </div>
        <svg width="26" height="26" viewBox="0 0 28 28" className="flex-shrink-0 mt-0.5">
          <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" stroke="hsl(var(--foreground))" />
          <circle
            cx="14" cy="14" r="10"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 14 14)"
          />
        </svg>
      </div>
    </div>
  );
}

function UpcomingRow({
  event,
  isNext = false,
  onClick,
}: {
  event: CalendarEvent;
  isNext?: boolean;
  onClick: () => void;
}) {
  const color = getCalendarColor(event.calendar);
  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const minsUntil = Math.max(0, differenceInMinutes(start, new Date()));
  const isTentative = event.participationStatus === 4;

  if (isNext) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "rounded-r-lg pl-2.5 pr-3 py-2.5 mb-1 border-l-[3px] hover:bg-accent/40 transition-colors cursor-pointer",
          color.border,
          isTentative && "opacity-50",
        )}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            · in {fmtRelative(minsUntil)}
          </span>
        </div>
        <div className="font-semibold text-sm leading-snug truncate">{event.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {fmtTime(start)} – {fmtTime(end)}
          {event.location && (
            <span className="ml-1.5 opacity-70">· {event.location}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 pl-2.5 pr-3 py-2 rounded-r-lg border-l-[3px] mb-1 hover:bg-accent/40 transition-colors cursor-pointer",
        color.border,
        isTentative && "opacity-50",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{event.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {fmtTime(start)} – {fmtTime(end)}
        </div>
      </div>
    </div>
  );
}

export function UpcomingEvents() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data } = useQuery({
    queryKey: ["calendar-events", format(today, "yyyy-MM-dd")],
    queryFn: () =>
      calendarService.getEvents(
        formatISO(startOfDay(today)),
        formatISO(endOfDay(today)),
      ),
    refetchInterval: 2 * 60_000,
  });

  const { current, upcoming, remaining } = useMemo(() => {
    const now = new Date();
    const timed = (data?.events ?? []).filter((e) => !e.isAllDay);

    const current =
      timed.find((e) => {
        const s = parseISO(e.startDate);
        const en = parseISO(e.endDate);
        return s <= now && en >= now;
      }) ?? null;

    const future = timed
      .filter((e) => parseISO(e.startDate) > now)
      .sort(
        (a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(),
      );

    return {
      current,
      upcoming: future.slice(0, MAX_UPCOMING),
      remaining: Math.max(0, future.length - MAX_UPCOMING),
    };
  }, [data]);

  if (!current && upcoming.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Upcoming
        </div>

        {current && (
          <CurrentEventCard event={current} onClick={() => setSelectedEvent(current)} />
        )}

        {upcoming.map((e, i) => (
          <UpcomingRow
            key={e.id}
            event={e}
            isNext={i === 0}
            onClick={() => setSelectedEvent(e)}
          />
        ))}

        {remaining > 0 && (
          <button
            onClick={() => navigate("/home/calendar")}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1.5"
          >
            +{remaining} more event{remaining !== 1 ? "s" : ""} today
          </button>
        )}
      </div>

      <CalendarEventSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}
