package database

import (
	"testing"
	"time"
)

func pht() *time.Location {
	return time.FixedZone("PHT", 8*3600)
}

// startOfUTCDay takes the calendar date from the time's OWN location, not from
// its UTC instant. That's deliberate — it means "the day the user saw on their
// own clock" — but it means the caller must hand it a time already normalised
// to UTC, or the two can disagree.
func TestStartOfUTCDayUsesTheTimesOwnCalendarDate(t *testing.T) {
	local := time.Date(2026, 3, 15, 7, 0, 0, 0, pht())

	// Same instant expressed in UTC is the previous day.
	if got := local.UTC().Format("2006-01-02"); got != "2026-03-14" {
		t.Errorf("UTC date of a 07:00 PHT instant = %s, want 2026-03-14", got)
	}

	// startOfUTCDay reads the local fields, so it yields Mar 15's midnight.
	if got := startOfUTCDay(local).Format("2006-01-02"); got != "2026-03-15" {
		t.Errorf("startOfUTCDay(local) = %s, want 2026-03-15 (read from PHT fields)", got)
	}
	// Normalising first yields the other day — the two paths are not equivalent.
	if got := startOfUTCDay(local.UTC()).Format("2006-01-02"); got != "2026-03-14" {
		t.Errorf("startOfUTCDay(local.UTC()) = %s, want 2026-03-14", got)
	}
}

// Reproduces the actual bug: go-sqlite3 stores time.Now() with the writer's local
// UTC offset, and SQLite compares those as strings. A row created at 07:00 in
// UTC+8 is 23:00 UTC the previous day, but its string starts with "2026-03-15",
// so a range filter on 2026-03-14 silently drops it.
func TestMixedOffsetTimestampsBreakRangeComparison(t *testing.T) {
	created := time.Date(2026, 3, 15, 7, 0, 0, 0, pht())
	stored := created.Format(sqliteTimestampLayouts[0])

	if stored != "2026-03-15 07:00:00+08:00" {
		t.Fatalf("stored form = %q", stored)
	}

	// The instant genuinely belongs to the 2026-03-14 UTC day...
	instantDay := created.UTC().Format("2006-01-02")
	if instantDay != "2026-03-14" {
		t.Fatalf("fixture wrong: instant day = %s", instantDay)
	}

	// ...but as a string it sorts into the *next* day's window.
	boundFor := func(day string, addDays int) string {
		d, _ := time.Parse("2006-01-02", day)
		return startOfUTCDay(d.AddDate(0, 0, addDays)).Format(sqliteTimestampLayouts[0])
	}

	march14Window := func() (string, string) {
		return boundFor("2026-03-14", 0), boundFor("2026-03-14", 1)
	}
	from, to := march14Window()

	if stored >= from && stored < to {
		t.Log("string comparison agreed with the instant (offset happened to line up)")
	} else {
		t.Logf("confirmed: %q is excluded from [%q, %q) despite being %s UTC",
			stored, from, to, instantDay)
	}

	// The fix makes the comparison agree with the instant.
	normalized := created.UTC().Format(sqliteTimestampLayouts[0])
	if normalized != "2026-03-14 23:00:00+00:00" {
		t.Fatalf("normalized = %q", normalized)
	}
	if !(normalized >= from && normalized < to) {
		t.Errorf("normalized %q should fall inside [%q, %q)", normalized, from, to)
	}
}

// Legacy rows and post-fix rows must describe the same instant, so reading one
// doesn't shift it relative to the other.
func TestLegacyAndNormalizedFormsDescribeTheSameInstant(t *testing.T) {
	legacy := "2026-03-15 07:00:00+08:00"
	normalized := "2026-03-14 23:00:00+00:00"

	legacyTime, err := normalizeTimestamp(legacy)
	if err != nil {
		t.Fatal(err)
	}
	normalizedTime, err := normalizeTimestamp(normalized)
	if err != nil {
		t.Fatal(err)
	}

	if !legacyTime.Equal(normalizedTime) {
		t.Errorf("instants differ: %v vs %v", legacyTime, normalizedTime)
	}
	if legacyTime.UTC().Format(sqliteTimestampLayouts[0]) != normalized {
		t.Errorf("legacy does not normalise to the expected string")
	}
}

// Every bound we generate must use the layout go-sqlite3 writes, or string
// comparison silently degrades to nonsense.
func TestSQLiteLayoutRoundTripsInstants(t *testing.T) {
	samples := []time.Time{
		time.Date(2026, 3, 14, 23, 0, 0, 0, time.UTC),
		time.Date(2026, 12, 31, 23, 59, 59, 0, time.UTC),
		time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2028, 2, 29, 12, 0, 0, 0, time.UTC),
		time.Date(2026, 3, 15, 7, 0, 0, 0, pht()),
		time.Date(2026, 3, 15, 7, 0, 0, 0, time.FixedZone("UTC-5", -5*3600)),
	}

	for _, ts := range samples {
		normalized := ts.UTC()
		written := normalized.Format(sqliteTimestampLayouts[0])

		parsed, err := time.Parse(sqliteTimestampLayouts[0], written)
		if err != nil {
			t.Fatalf("%v: %v", ts, err)
		}
		if !parsed.Equal(normalized) {
			t.Errorf("round trip changed the instant: %v -> %v", normalized, parsed)
		}
		// -07:00 in the layout yields an anonymous fixed zone; the offset must
		// still be zero for UTC rows, which is what makes ordering hold.
		if _, offset := parsed.Zone(); offset != 0 {
			t.Errorf("%v round-tripped with offset %d, want 0", normalized, offset)
		}
	}
}

// The composite index and every range query depend on lexicographic order
// matching chronological order. This only holds when all values are UTC
// normalised, which is what the writer guarantees.
func TestNormalizedTimestampsSortChronologically(t *testing.T) {
	base := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)

	previous := ""
	for i := 0; i < 2000; i++ {
		ts := base.Add(time.Duration(i) * 37 * time.Second).UTC().Format(sqliteTimestampLayouts[0])
		if i > 0 && !(previous < ts) {
			t.Fatalf("step %d: %q should sort before %q", i, previous, ts)
		}
		previous = ts
	}
}

// Day bucketing the UI relies on: an expense belongs to exactly one day bucket,
// and the buckets are derived from the same instant the range filter uses.
func TestDayBucketIsSingleAndConsistent(t *testing.T) {
	// Three expenses spanning a local day boundary, all on the same UTC day.
	times := []time.Time{
		time.Date(2026, 3, 14, 23, 30, 0, 0, time.UTC),
		time.Date(2026, 3, 15, 0, 15, 0, 0, time.UTC),
		time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC),
	}

	// One instant, one day. The +08:00 rendering of the first is Mar 15 locally,
	// but the bucket must follow the instant, not the rendered string.
	normalized := times[0].UTC().Format(sqliteTimestampLayouts[0])
	day := startOfUTCDay(times[0]).Format("2006-01-02")

	from := startOfUTCDay(times[0]).Format(sqliteTimestampLayouts[0])
	to := startOfUTCDay(times[0]).AddDate(0, 0, 1).Format(sqliteTimestampLayouts[0])
	if !(normalized >= from && normalized < to) {
		t.Errorf("%q not in [%q, %q)", normalized, from, to)
	}

	if day != "2026-03-14" {
		t.Errorf("bucket = %s, want 2026-03-14", day)
	}

	// Every timestamp lands in exactly one of the two days.
	for _, ts := range times {
		d := startOfUTCDay(ts.UTC()).Format("2006-01-02")
		if d != "2026-03-14" && d != "2026-03-15" {
			t.Errorf("%v bucketed to unexpected day %s", ts, d)
		}
	}
}
