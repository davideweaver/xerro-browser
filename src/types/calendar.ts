export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  calendar: string;
  isAllDay: boolean;
  isRecurring: boolean;
  participationStatus: number;
  location?: string;
  notes?: string;
  url?: string;
}

export interface CalendarEventsResult {
  events: CalendarEvent[];
  count: number;
  date?: string;
  startDate?: string;
  endDate?: string;
}
