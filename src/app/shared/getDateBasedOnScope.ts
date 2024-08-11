/**
 * Calculates and returns a date string in 'YYYY-MM-DD' format based on the specified time scope and quantity.
 * @param scope - Specifies the time scope for the date calculation. Can be 'week' or 'month'.
 * @param quantity - The number of weeks or months to go back from today. Default is 1.
 * @returns A string representing the date in 'YYYY-MM-DD' format.
 */
export function getDateBasedOnScope(scope: 'week' | 'month', quantity: number = 1): string {

  const today = new Date();
  const targetDate = new Date(today);
  switch (scope) {
    case 'week':
      targetDate.setDate(today.getDate() - 7 * quantity); // Go back 7 days
      break;
    case 'month':
      targetDate.setMonth(today.getMonth() - 1 * quantity); // Go back 1 month
      break;
    default:
      throw new Error("Invalid scope. Use 'week' or 'month'.");
  }
  return targetDate.toISOString().substring(0, 'jjjj-mm-dd'.length);
}