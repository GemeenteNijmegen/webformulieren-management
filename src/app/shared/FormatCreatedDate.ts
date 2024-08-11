/**
 * Formats a given date string to a specific date and time format.
 *
 * @param dateString - The input date string that needs to be formatted.
 * @param timezoneOffsetHours - The number of hours to adjust for timezone offset. Defaults to 2 hours.
 * @returns An object containing the formatted date and time as strings.
 */
export function formatDateTime(dateString: string, timezoneOffsetHours: number = 2): { formattedDate: string; formattedTime: string } {
  const date = new Date(dateString);
  // Adjust for the timezone offset (e.g., +2 hours)
  date.setHours(date.getHours() + timezoneOffsetHours);
  // Format date as DD-MM-YYYY
  const formattedDate = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Format time as HH:MM
  const formattedTime = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return {
    formattedDate,
    formattedTime,
  };
}