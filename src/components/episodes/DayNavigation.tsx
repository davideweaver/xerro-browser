import { useState, useRef, useEffect } from "react";
import { DayCard } from "./DayCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, startOfDay, isSameDay, format, startOfWeek } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface DayNavigationProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange?: (weekStart: Date) => void;
  dateRange: { start: string; end: string };
  localStats?: Map<string, number>; // Pre-computed stats in local timezone
}

export function DayNavigation({
  selectedDate,
  onDateSelect,
  onWeekChange,
  dateRange: _dateRange,
  localStats,
}: DayNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Calculate the range of days to show (7 days starting with Monday)
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(selectedDate, { weekStartsOn: 1 })
  );
  const visibleDays = 7;

  const days = Array.from({ length: visibleDays }, (_, i) =>
    addDays(weekStartDate, i)
  );

  // Notify parent when visible week changes
  useEffect(() => {
    onWeekChange?.(weekStartDate);
  }, [weekStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get session count for a specific day
  const getSessionCountForDay = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return localStats?.get(dateString) || 0;
  };

  // Scroll functions - navigate by full weeks
  const scrollLeft = () => {
    setWeekStartDate((prev) => addDays(prev, -visibleDays));
  };

  const scrollRight = () => {
    setWeekStartDate((prev) => addDays(prev, visibleDays));
  };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header with date range */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold">
          {isMobile ? (
            <>
              {format(days[0], "MMM d")} - {format(days[days.length - 1], "MMM d")}
            </>
          ) : (
            <>
              {format(days[0], "MMM d")} - {format(days[days.length - 1], "MMM d, yyyy")}
            </>
          )}
        </h2>
      </div>

      {/* Mobile layout: Day cards on top row, navigation buttons on bottom row */}
      {isMobile ? (
        <div className="space-y-2">
          {/* Day cards row */}
          <div
            ref={scrollContainerRef}
            className="flex gap-1 overflow-x-auto scrollbar-hide"
          >
            {days.map((day) => (
              <DayCard
                key={day.toISOString()}
                date={day}
                sessionCount={getSessionCountForDay(day)}
                isSelected={isSameDay(day, selectedDate)}
                isToday={isSameDay(day, today)}
                onClick={() => onDateSelect(startOfDay(day))}
                compact={true}
              />
            ))}
          </div>

          {/* Navigation buttons row */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollLeft}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollRight}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        /* Desktop layout: Navigation buttons on sides */
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
          >
            {days.map((day) => (
              <DayCard
                key={day.toISOString()}
                date={day}
                sessionCount={getSessionCountForDay(day)}
                isSelected={isSameDay(day, selectedDate)}
                isToday={isSameDay(day, today)}
                onClick={() => onDateSelect(startOfDay(day))}
                compact={false}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
