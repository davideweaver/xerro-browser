import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type { CalendarEventsResult } from "@/types/calendar";

interface CalendarQueryOpts {
  calendars?: string;
  includeAllDay?: boolean;
  participationStatus?: string;
}

function buildParams(opts: CalendarQueryOpts = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.append("participationStatus", opts.participationStatus ?? "2,4");
  if (opts.calendars) params.append("calendars", opts.calendars);
  if (opts.includeAllDay !== undefined) params.append("includeAllDay", String(opts.includeAllDay));
  return params;
}

class CalendarService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  async getTodayEvents(opts?: CalendarQueryOpts): Promise<CalendarEventsResult> {
    try {
      const qs = buildParams(opts).toString();
      const response = await apiFetch(`${this.baseUrl}/api/v1/calendar/today?${qs}`);
      if (!response.ok) throw new Error(`Failed to fetch today's events: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch calendar events", variant: "destructive" });
      throw error;
    }
  }

  async getWeekEvents(opts?: CalendarQueryOpts): Promise<CalendarEventsResult> {
    try {
      const qs = buildParams(opts).toString();
      const response = await apiFetch(`${this.baseUrl}/api/v1/calendar/week?${qs}`);
      if (!response.ok) throw new Error(`Failed to fetch week events: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch calendar events", variant: "destructive" });
      throw error;
    }
  }

  async getEvents(startDate: string, endDate: string, opts?: CalendarQueryOpts): Promise<CalendarEventsResult> {
    try {
      const params = buildParams(opts);
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      const response = await apiFetch(`${this.baseUrl}/api/v1/calendar/events?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch events: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch calendar events", variant: "destructive" });
      throw error;
    }
  }
}

export const calendarService = new CalendarService();
