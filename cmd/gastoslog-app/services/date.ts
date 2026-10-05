/**
 * Date helpers for the expense date-range filter.
 *
 * Everything here is "wall clock": a `YYYY-MM-DD` string is the calendar day
 * the user sees on their own phone, in their own timezone. That is why
 * `toISODate` formats the local fields by hand instead of calling
 * `toISOString()` — the latter converts to UTC *first*, so in UTC+8 (this
 * app's locale, `fil-PH`) asking for "today" between midnight and 08:00
 * returns tomorrow's date. The old `toISOString().split("T")[0]` idiom used
 * elsewhere in the app has that bug; don't copy it into new code.
 *
 * The server treats these strings as UTC calendar days (see `buildWhere` in
 * internal/database/expense.go), which is consistent as long as both sides
 * agree on which day the user meant.
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Format a Date as a local-timezone `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = parseISODate(value);
  // Round-trips only if the components were real (rejects 2026-02-30).
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

/**
 * Parse `YYYY-MM-DD` into a Date at *local* midnight.
 *
 * `new Date("2026-03-15")` is specified as UTC midnight, which in a positive
 * offset lands at 08:00 local on the same day and in a negative offset lands on
 * the previous day — so the calendar day would silently shift. Building from
 * parts keeps it on the day the user typed.
 */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Add (or subtract, with a negative n) whole days, returning `YYYY-MM-DD`. */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function startOfMonthISO(iso: string): string {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonthISO(iso: string): string {
  const date = parseISODate(iso);
  // Day 0 of the next month is the last day of this one.
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function startOfYearISO(iso: string): string {
  return `${parseISODate(iso).getFullYear()}-01-01`;
}

/* -------------------------------------------------------------------------- */
/*                               Date presets                                 */
/* -------------------------------------------------------------------------- */

export const datePresets = [
  "today",
  "last7",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "all",
] as const;

export type DatePreset = (typeof datePresets)[number];

export const datePresetLabels: Record<DatePreset, string> = {
  today: "Today",
  last7: "Last 7 Days",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  thisYear: "This Year",
  all: "All Time",
};

/** The range a preset stands for, given the reference day. */
export type DateRange = { from?: string; to?: string };

/**
 * Resolve a preset to a concrete range.
 *
 * Open-ended presets ("This Month", "This Year") end at *today* rather than the
 * end of the period — expenses can't be logged in the future, so ending on the
 * last day of the month would just widen the range with rows that can never
 * match.
 */
export function resolvePreset(
  preset: DatePreset,
  reference: string = todayISO(),
): DateRange {
  switch (preset) {
    case "today":
      return { from: reference, to: reference };
    case "last7":
      // Inclusive of today, so 7 days = today plus the 6 before it.
      return { from: addDays(reference, -6), to: reference };
    case "thisMonth":
      return { from: startOfMonthISO(reference), to: reference };
    case "lastMonth": {
      const thisMonthStart = parseISODate(startOfMonthISO(reference));
      const lastMonthDay = toISODate(
        new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), 0),
      );
      return {
        from: startOfMonthISO(lastMonthDay),
        to: endOfMonthISO(lastMonthDay),
      };
    }
    case "thisYear":
      return { from: startOfYearISO(reference), to: reference };
    case "all":
      return {};
  }
}

/**
 * Which preset (if any) a range corresponds to. Lets the collapsed control say
 * "This Month" for a preset pick while still showing the real dates once the
 * user hand-edits them, rather than silently showing a stale preset name.
 */
export function matchPreset(
  range: DateRange,
  reference: string = todayISO(),
): DatePreset | null {
  for (const preset of datePresets) {
    const resolved = resolvePreset(preset, reference);
    if (resolved.from === range.from && resolved.to === range.to) {
      return preset;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Labels                                    */
/* -------------------------------------------------------------------------- */

/** `2026-03-15` -> `Mar 15` */
export function formatISODateShort(iso: string): string {
  const date = parseISODate(iso);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** `2026-03-15` -> `Mar 15, 2026` */
export function formatISODateLong(iso: string): string {
  const date = parseISODate(iso);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Human label for a day bucket, relative to `reference`.
 *
 * "Today" / "Yesterday" beat a date the eye has to decode, which is the point of
 * grouping the list by day in the first place. The year is only shown when it
 * differs from the reference year, to keep headers short.
 */
export function dayLabel(iso: string, reference: string = todayISO()): string {
  if (iso === reference) return "Today";
  if (iso === addDays(reference, -1)) return "Yesterday";

  const date = parseISODate(iso);
  const base = `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === parseISODate(reference).getFullYear()
    ? base
    : `${base}, ${date.getFullYear()}`;
}

/** A compact, unambiguous range label for a summary caption or chip. */
export function formatRangeLabel(range: DateRange): string {
  const { from, to } = range;

  if (!from && !to) return "All time";
  if (from && to) {
    if (from === to) return formatISODateShort(from);
    // Drop a redundant year when both ends are in the same one.
    if (parseISODate(from).getFullYear() === parseISODate(to).getFullYear()) {
      return `${formatISODateShort(from)} – ${formatISODateShort(to)}`;
    }
    return `${formatISODateShort(from)}, ${parseISODate(from).getFullYear()} – ${formatISODateShort(to)}, ${parseISODate(to).getFullYear()}`;
  }
  if (from) return `${formatISODateShort(from)} – now`;
  return `Up to ${formatISODateShort(to as string)}`;
}

/* -------------------------------------------------------------------------- */
/*                                Validation                                  */
/* -------------------------------------------------------------------------- */

export type DateRangeError =
  | "incomplete"
  | "reversed"
  | "future"
  | "tooLong"
  | null;

/**
 * Max span the custom picker allows, to keep a filter from spanning decades.
 * Counts *inclusive* days, so a span difference of up to MAX_RANGE_DAYS - 1 is
 * accepted.
 */
export const MAX_RANGE_DAYS = 366;

/**
 * Validate a custom range. Returns a reason key rather than a message so the
 * UI owns the copy.
 *
 * `reference` is the latest selectable day (today, in practice) — a range may
 * not reach past it.
 */
export function validateDateRange(
  range: DateRange,
  reference: string = todayISO(),
): DateRangeError {
  const { from, to } = range;

  // Open-ended is a legitimate choice ("everything since March"), so only a
  // half-filled custom entry is incomplete.
  if (!from || !to) return null;

  if (!isValidISODate(from) || !isValidISODate(to)) return "incomplete";

  if (parseISODate(to) < parseISODate(from)) return "reversed";
  if (parseISODate(to) > parseISODate(reference)) return "future";

  // Inclusive day count = difference in days + 1.
  const inclusiveDays =
    Math.round(
      (parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000,
    ) + 1;
  if (inclusiveDays > MAX_RANGE_DAYS) return "tooLong";

  return null;
}