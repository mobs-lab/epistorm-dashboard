export const isUTCDateEqual = (a: Date, b: Date) => {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
};

export function normalizeToUTCMidDay(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(12, 0, 0, 0);
  return utcDate;
}
