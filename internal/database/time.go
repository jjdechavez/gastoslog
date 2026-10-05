package database

import (
	"fmt"
	"time"
)

// sqliteTimestampLayouts are the shapes go-sqlite3 can write or be asked to
// parse, most specific first. normalizeTimestamp walks these in order so a
// legacy row (local offset) and a migrated row (UTC) describing the same instant
// read back identically.
var sqliteTimestampLayouts = []string{
	"2006-01-02 15:04:05.999999999-07:00",
	"2006-01-02T15:04:05.999999999-07:00",
	"2006-01-02 15:04:05.999999999Z07:00",
	"2006-01-02T15:04:05.999999999Z07:00",
	"2006-01-02 15:04:05.999999999",
	"2006-01-02 15:04:05",
	"2006-01-02",
}

// now returns the current instant in UTC.
//
// Every write must go through this rather than time.Now(). go-sqlite3 serialises
// a time.Time using the value's own UTC offset, so a server running in UTC+8
// writes "2026-03-15 07:00:00+08:00" — a string that *sorts* into the 15th while
// describing an instant that is 23:00 UTC on the 14th. Because SQLite compares
// these as text, range filters and day-bucketing would then disagree with the
// timestamp itself.
//
// Storing UTC unconditionally makes lexicographic order equal chronological
// order, which is what the composite indexes and the half-open [from, to+1d)
// range comparisons rely on.
//
// Note this also fixes the *display* question by making it moot: the API returns
// an RFC3339 instant, and the client renders it in the viewer's own timezone.
func now() time.Time {
	return time.Now().UTC()
}

// normalizeTimestamp parses a stored timestamp and returns the instant in UTC.
// Tolerates every layout go-sqlite3 can produce, so it reads pre-migration rows
// (local offset) and post-migration rows (UTC) identically.
func normalizeTimestamp(stored string) (time.Time, error) {
	for _, layout := range sqliteTimestampLayouts {
		if parsed, err := time.Parse(layout, stored); err == nil {
			return parsed.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("unrecognised timestamp format: %q", stored)
}
