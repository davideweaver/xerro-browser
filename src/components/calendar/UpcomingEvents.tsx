import { useMemo, useState } from "react";
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
  const color = getCalendarColor(event.calendar);
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg bg-accent/40 px-3 py-2.5 mb-1 hover:bg-accent/60 transition-colors cursor-pointer",
        isTentative && "opacity-50",
      )}
    >
      <div className="mb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
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
      <div className="h-0.5 bg-border/50 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", color.bg)}
          style={{ width: `${progress}%`, opacity: 0.75 }}
        />
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
          "flex items-start gap-2.5 pr-3 py-2.5 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer",
          isTentative && "opacity-50",
        )}
      >
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0 mt-1.5", color.dot)} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-base leading-snug truncate">{event.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {fmtTime(start)} – {fmtTime(end)}
            {event.location && (
              <span className="ml-1.5 opacity-70">· {event.location}</span>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground/60 flex-shrink-0 mt-0.5">
          in {fmtRelative(minsUntil)}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 pr-3 py-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer",
        isTentative && "opacity-50",
      )}
    >
      <div className={cn("h-2 w-2 rounded-full flex-shrink-0", color.dot)} />
      <div className="flex-1 min-w-0 text-sm truncate">{event.title}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
        <span className="text-muted-foreground/60">in {fmtRelative(minsUntil)}</span>
        <span className="text-muted-foreground/30">·</span>
        <span>{fmtTime(start)}</span>
      </div>
    </div>
  );
}

export function UpcomingEvents() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data } = useQuery({
    queryKey: ["calendar-events", format(today, "yyyy-MM-dd")],
    queryFn: () =>
      calendarService.getEvents(
        formatISO(startOfDay(today)),
        formatISO(endOfDay(today)),
      ),
    refetchInterval: 60_000,
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
