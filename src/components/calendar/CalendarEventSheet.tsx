import { format, parseISO, differenceInMinutes } from "date-fns";
import { Clock, MapPin, RefreshCw, ExternalLink, AlignLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCalendarColor } from "@/lib/calendarColors";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

function fmtDuration(start: Date, end: Date): string {
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h}h ${m}m`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
}

export function CalendarEventSheet({ event, onClose }: Props) {
  const color = event ? getCalendarColor(event.calendar) : null;
  const isTentative = event?.participationStatus === 4;

  const start = event ? parseISO(event.startDate) : null;
  const end = event ? parseISO(event.endDate) : null;

  const dateStr = start ? format(start, "EEEE, MMMM d") : "";
  const timeStr =
    event?.isAllDay
      ? "All day"
      : start && end
        ? `${format(start, "h:mm a").toLowerCase()} – ${format(end, "h:mm a").toLowerCase()}`
        : "";
  const durationStr = !event?.isAllDay && start && end ? fmtDuration(start, end) : null;

  const notesText = event?.notes ? stripHtml(event.notes) : null;

  let urlHost = "";
  try {
    if (event?.url) urlHost = new URL(event.url).hostname;
  } catch {
    urlHost = event?.url ?? "";
  }

  return (
    <Sheet open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                color?.dot,
                isTentative && "opacity-50",
              )}
            />
            <span className="text-xs text-muted-foreground">{event?.calendar}</span>
            {isTentative && (
              <span className="text-xs text-muted-foreground/50 italic">· maybe</span>
            )}
          </div>
          <SheetTitle
            className={cn("text-xl leading-snug pr-8", isTentative && "opacity-70")}
          >
            {event?.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm">{dateStr}</div>
              <div className="text-sm text-muted-foreground">
                {timeStr}
                {durationStr && (
                  <span className="ml-1.5 opacity-70">· {durationStr}</span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {event?.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-sm">{event.location}</span>
            </div>
          )}

          {/* URL */}
          {event?.url && (
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {urlHost}
              </a>
            </div>
          )}

          {/* Recurring */}
          {event?.isRecurring && (
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Recurring event</span>
            </div>
          )}

          {/* Notes */}
          {notesText && (
            <div className="flex items-start gap-3 pt-1">
              <AlignLeft className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {notesText}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
