const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function nextDateForDay(day: string) {
  const targetDay = DAY_INDEX[day];
  if (targetDay === undefined) return null;
  const date = new Date();
  let offset = (targetDay - date.getDay() + 7) % 7;
  if (offset === 0) offset = 7;
  date.setDate(date.getDate() + offset);
  return date;
}

