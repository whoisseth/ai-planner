import { z } from "zod";
import { tool } from "ai";

// Timezone mapping for common locations
const TIMEZONE_MAP: Record<string, string> = {
  'america': 'America/New_York',
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'india': 'Asia/Kolkata',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'tokyo': 'Asia/Tokyo',
  'sydney': 'Australia/Sydney',
  'singapore': 'Asia/Singapore',
  'dubai': 'Asia/Dubai',
  'moscow': 'Europe/Moscow',
  'beijing': 'Asia/Shanghai',
};

// Utility functions for timezone handling
export const getLocationTimezone = (location: string): string | null => {
  const normalizedLocation = location.trim().toLowerCase();
  return TIMEZONE_MAP[normalizedLocation] || null;
};

export const extractLocationFromQuery = (query: string): string | null => {
  const timeInLocationMatch = query.toLowerCase().match(/time in ([a-z\s]+)(?:\?)?$/i);
  return timeInLocationMatch ? timeInLocationMatch[1].trim() : null;
};

export const determineTargetTimezone = (
  query: string,
  userTimeZone: string
): { 
  targetTimeZone: string, 
  isLocationSpecific: boolean 
} => {
  const location = extractLocationFromQuery(query);
  if (location) {
    const locationTimezone = getLocationTimezone(location);
    return {
      targetTimeZone: locationTimezone || userTimeZone,
      isLocationSpecific: true
    };
  }
  return {
    targetTimeZone: userTimeZone,
    isLocationSpecific: false
  };
};

// Helper functions for date and time formatting
export const formatDate = (date: Date, timeZone?: string): string => {
  return date.toLocaleDateString("en-US", {
    weekday: 'long',
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone
  });
};

export const formatTime = (date: Date, timeZone?: string): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone
  });
};

export const getCurrentDateTime = (timeZone?: string): { 
  date: string;
  time: string;
  timeZoneName: string;
  timestamp: number;
} => {
  const now = new Date();
  const timeZoneName = timeZone ? 
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'long', timeZone })
      .formatToParts()
      .find(part => part.type === 'timeZoneName')?.value || timeZone
    : 'Local Time';

  return {
    date: formatDate(now, timeZone),
    time: formatTime(now, timeZone),
    timeZoneName,
    timestamp: now.getTime()
  };
};

// Define the date/time tool
export const dateTimeTool = tool({
  type: "function",
  description: "Gets the current date and time in a human-readable format for a specific timezone",
  parameters: z.object({
    includeSeconds: z
      .boolean()
      .optional()
      .describe("Whether to include seconds in the time output"),
    format: z
      .enum(["short", "full"])
      .optional()
      .describe("Format of the date/time output - 'short' or 'full'"),
    timeZone: z
      .string()
      .optional()
      .describe("The IANA timezone identifier (e.g., 'America/New_York', 'Asia/Kolkata')")
  }),
  execute: async ({
    includeSeconds = true,
    format = "full",
    timeZone
  }: {
    includeSeconds?: boolean;
    format?: "short" | "full";
    timeZone?: string;
  }) => {
    try {
      const now = new Date();
      
      let dateFormat: Intl.DateTimeFormatOptions = {
        weekday: format === "full" ? "long" : "short",
        day: "numeric",
        month: format === "full" ? "long" : "short",
        year: "numeric",
        timeZone
      };

      let timeFormat: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone
      };

      if (includeSeconds) {
        timeFormat.second = "2-digit";
      }

      const formattedDate = now.toLocaleDateString("en-US", dateFormat);
      const formattedTime = now.toLocaleTimeString("en-US", timeFormat);
      
      // Get timezone name for display
      const timeZoneName = timeZone ? 
        new Intl.DateTimeFormat('en-US', { timeZoneName: 'long', timeZone })
          .formatToParts()
          .find(part => part.type === 'timeZoneName')?.value || timeZone
        : 'Local Time';

      return {
        success: true,
        currentDateTime: {
          date: formattedDate,
          time: formattedTime,
          timestamp: now.getTime(),
          iso: now.toISOString(),
          timeZone: timeZoneName
        }
      };
    } catch (error: any) {
      console.error("Error in dateTimeTool:", error);
      return {
        success: false,
        error: `Failed to get current date/time: ${error.message}`
      };
    }
  }
}); 