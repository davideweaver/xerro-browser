import { useMemo } from "react";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ActiveDay {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

interface ProjectTimelineBarProps {
  projectName: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  activeDays?: ActiveDay[];
  onDayClick?: (dateKey: string) => void;
  className?: string;
}

interface DayBar {
  date: Date;
  dateKey: string;
  count: number;
  position: number;
  hasNextDay: boolean;
  hasPrevDay: boolean;
}

export function ProjectTimelineBar({
  projectName: _projectName,
  projectStartDate,
  projectEndDate,
  activeDays,
  onDayClick,
  className = "",
}: ProjectTimelineBarProps) {

  const isEmpty = !projectStartDate || !projectEndDate || !activeDays || activeDays.length === 0;

  const timelineData = useMemo(() => {
    if (!projectStartDate || !projectEndDate || !activeDays || activeDays.length === 0) return null;

    const projectStart = startOfDay(parseISO(projectStartDate));
    const projectEnd = startOfDay(parseISO(projectEndDate));
    const actualDays = differenceInDays(projectEnd, projectStart) + 1;

    // Always show at least 7 days
    const totalDays = Math.max(actualDays, 7);

    // Adjust end date if we're extending the timeline
    const displayEnd = actualDays < 7
      ? new Date(projectStart.getTime() + (6 * 24 * 60 * 60 * 1000))
      : projectEnd;

    // Build day bars from activeDays
    const dayBars: DayBar[] = activeDays.map(({ date: dateKey, count }) => {
      const dayDate = parseISO(dateKey);
      const daysSinceStart = differenceInDays(dayDate, projectStart);
      const position = (daysSinceStart / Math.max(totalDays, 1)) * 100;
      return {
        date: dayDate,
        dateKey,
        count,
        position,
        hasNextDay: false,
        hasPrevDay: false,
      };
    });

    // Sort by date (activeDays should already be sorted ASC, but be safe)
    dayBars.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate adjacency for continuous bar rendering
    dayBars.forEach((dayBar, index) => {
      if (index > 0) {
        const prevDay = dayBars[index - 1];
        if (differenceInDays(dayBar.date, prevDay.date) === 1) {
          dayBar.hasPrevDay = true;
          prevDay.hasNextDay = true;
        }
      }
    });

    // Calculate smart date markers based on timeline duration
    const getDateMarkers = () => {
      if (totalDays <= 7) {
        return Array.from({ length: totalDays }, (_, i) => {
          const date = new Date(projectStart);
          date.setDate(date.getDate() + i);
          const position = totalDays === 1 ? 50 : (i / (totalDays - 1)) * 100;
          return { date, position };
        });
      } else if (totalDays <= 31) {
        return Array.from({ length: 5 }, (_, i) => {
          const date = new Date(projectStart);
          date.setDate(date.getDate() + Math.floor((i * totalDays) / 4));
          return { date, position: (i / 4) * 100 };
        });
      } else if (totalDays <= 90) {
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(projectStart);
          date.setDate(date.getDate() + Math.floor((i * totalDays) / 6));
          return { date, position: (i / 6) * 100 };
        });
      } else {
        const markers: { date: Date; position: number }[] = [];
        const currentDate = new Date(projectStart);
        while (currentDate <= displayEnd) {
          const daysSince = differenceInDays(currentDate, projectStart);
          markers.push({ date: new Date(currentDate), position: (daysSince / totalDays) * 100 });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        return markers;
      }
    };

    return { dayBars, dateMarkers: getDateMarkers(), totalDays, displayEnd, actualDays };
  }, [activeDays, projectStartDate, projectEndDate]);

  const handleDayClick = (dayBar: DayBar) => {
    onDayClick?.(dayBar.dateKey);
  };

  const formatMarkerDate = (date: Date) => {
    if (!timelineData) return format(date, "MMM d");
    if (timelineData.totalDays <= 90) return format(date, "MMM d");
    return format(date, "MMM");
  };

  return (
    <div className={`mt-6 ${className}`}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Activity Timeline
      </div>

      {/* Date markers */}
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-1">
        {isEmpty || !timelineData
          ? Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="whitespace-nowrap invisible">0</span>
            ))
          : timelineData.dateMarkers.map((marker, i) => (
              <span key={i} className="whitespace-nowrap">
                {formatMarkerDate(marker.date)}
              </span>
            ))}
      </div>

      {/* Timeline track */}
      <div className="relative h-3 bg-muted/30 rounded-full overflow-visible">
        {!isEmpty && timelineData && timelineData.dayBars.map((dayBar, i) => {
          const roundedClass =
            dayBar.hasPrevDay && dayBar.hasNextDay
              ? ""
              : dayBar.hasPrevDay
              ? "rounded-r-full"
              : dayBar.hasNextDay
              ? "rounded-l-full"
              : "rounded-full";

          return (
            <div
              key={i}
              className="absolute h-full group cursor-pointer"
              style={{
                left: `${dayBar.position}%`,
                width: `${Math.max(100 / Math.max(timelineData.totalDays, 1), 1.5)}%`,
              }}
              onClick={() => handleDayClick(dayBar)}
              title={`${format(dayBar.date, "MMM d, yyyy")} - ${dayBar.count} session${dayBar.count > 1 ? "s" : ""}`}
            >
              <div className={`h-full bg-[#0EA5E9] ${roundedClass} transition-all`}>
                <div className={`absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity ${roundedClass}`} />
              </div>

              {dayBar.count > 1 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-6 left-1/2 -translate-x-1/2 h-5 min-w-5 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-background border"
                >
                  {dayBar.count}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats below */}
      <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 px-1">
        <span className={isEmpty || !projectStartDate ? "invisible" : undefined}>
          {isEmpty || !projectStartDate ? "Jan 1, 2000" : format(parseISO(projectStartDate), "MMM d, yyyy")}
        </span>
        <span className={isEmpty || !timelineData ? "invisible" : undefined}>
          {isEmpty || !timelineData ? "0 active days" : `${timelineData.dayBars.length} active day${timelineData.dayBars.length !== 1 ? "s" : ""}`}
        </span>
        <span className={isEmpty || !projectEndDate ? "invisible" : undefined}>
          {isEmpty || !projectEndDate ? "Jan 1, 2000" : format(parseISO(projectEndDate), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}
