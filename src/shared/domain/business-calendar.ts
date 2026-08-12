const TIMEZONE = 'America/Sao_Paulo';
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface ZonedDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function zonedFields(date: Date): Record<string, number> {
  const fields: Record<string, number> = {};

  for (const part of PARTS.formatToParts(date)) {
    if (part.type !== 'literal') {
      fields[part.type] = Number(part.value);
    }
  }

  return fields;
}

function offsetMs(date: Date): number {
  const f = zonedFields(date);
  const asUtc = Date.UTC(
    f.year,
    f.month - 1,
    f.day,
    f.hour % 24,
    f.minute,
    f.second,
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function toZonedDay(date: Date): ZonedDay {
  const f = zonedFields(date);
  const local = new Date(Date.UTC(f.year, f.month - 1, f.day));

  return {
    year: f.year,
    month: f.month,
    day: f.day,
    weekday: local.getUTCDay(),
  };
}

function dayKey(day: ZonedDay): string {
  return `${day.year}-${`${day.month}`.padStart(2, '0')}-${`${day.day}`.padStart(2, '0')}`;
}

function nextMidnight(date: Date): Date {
  const day = toZonedDay(date);
  const tomorrowUtc = Date.UTC(day.year, day.month - 1, day.day) + DAY_MS;

  return new Date(tomorrowUtc - offsetMs(date));
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function shiftDays(date: Date, days: number): string {
  const shifted = new Date(date.getTime() + days * DAY_MS);

  return `${shifted.getUTCFullYear()}-${`${shifted.getUTCMonth() + 1}`.padStart(2, '0')}-${`${shifted.getUTCDate()}`.padStart(2, '0')}`;
}

const FIXED_HOLIDAYS = [
  '01-01',
  '04-21',
  '05-01',
  '09-07',
  '10-12',
  '11-02',
  '11-15',
  '11-20',
  '12-25',
];

const holidayCache = new Map<number, ReadonlySet<string>>();

export function nationalHolidays(year: number): ReadonlySet<string> {
  const cached = holidayCache.get(year);

  if (cached) {
    return cached;
  }

  const easter = easterSunday(year);

  const holidays = new Set<string>([
    ...FIXED_HOLIDAYS.map((date) => `${year}-${date}`),
    shiftDays(easter, -48),
    shiftDays(easter, -47),
    shiftDays(easter, -2),
    shiftDays(easter, 60),
  ]);

  holidayCache.set(year, holidays);

  return holidays;
}

export function isBusinessDay(date: Date): boolean {
  const day = toZonedDay(date);

  if (day.weekday === 0 || day.weekday === 6) {
    return false;
  }

  return !nationalHolidays(day.year).has(dayKey(day));
}

export function isFirstBusinessDayOfMonth(date: Date): boolean {
  if (!isBusinessDay(date)) {
    return false;
  }

  const day = toZonedDay(date);

  for (let earlier = 1; earlier < day.day; earlier += 1) {
    const candidate = new Date(
      Date.UTC(day.year, day.month - 1, earlier, 12, 0, 0),
    );

    if (isBusinessDay(candidate)) {
      return false;
    }
  }

  return true;
}

export function addBusinessHours(from: Date, hours: number): Date {
  if (hours <= 0) {
    return from;
  }

  let remaining = hours * HOUR_MS;
  let cursor = from;

  while (remaining > 0) {
    const midnight = nextMidnight(cursor);

    if (!isBusinessDay(cursor)) {
      cursor = midnight;
      continue;
    }

    const availableToday = midnight.getTime() - cursor.getTime();

    if (remaining <= availableToday) {
      return new Date(cursor.getTime() + remaining);
    }

    remaining -= availableToday;
    cursor = midnight;
  }

  return cursor;
}
