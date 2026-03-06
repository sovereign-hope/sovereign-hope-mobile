export const getDateFromTimeString = (
  timeString: string,
  fallbackDate: Date = new Date()
): Date => {
  if (!timeString) {
    return new Date(fallbackDate);
  }

  const parsedTime = timeString
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i);

  if (!parsedTime) {
    return new Date(fallbackDate);
  }

  const hourPart = Number.parseInt(parsedTime[1], 10);
  const minute = Number.parseInt(parsedTime[2], 10);
  const ampm = parsedTime[3].toUpperCase();

  if (
    Number.isNaN(hourPart) ||
    Number.isNaN(minute) ||
    hourPart < 1 ||
    hourPart > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return new Date(fallbackDate);
  }

  let hour = hourPart;
  if (ampm === "PM" && hour !== 12) {
    hour += 12;
  }
  if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  const date = new Date(fallbackDate);
  date.setHours(hour, minute, 0, 0);
  return date;
};
