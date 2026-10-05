package database

import (
	"context"
	"testing"
	"time"
)

func overviewFixture(t *testing.T) (*expenseRepository, int64) {
	t.Helper()

	db := newTestDB(t)

	// A user, a category, and expenses spread over two UTC days.
	seed := `
		INSERT INTO users (id, email, password_hash, created_at, updated_at)
		VALUES (1, 'ov@test.local', 'x', '2026-03-14 00:00:00+00:00', '2026-03-14 00:00:00+00:00');
		INSERT INTO categories (id, user_id, name, created_at, updated_at)
		VALUES (1, 1, 'Food', '2026-03-14 00:00:00+00:00', '2026-03-14 00:00:00+00:00');

		INSERT INTO expenses (user_id, category_id, amount, description, created_at, updated_at) VALUES
			(1, 1, 1000, 'mar14 morning', '2026-03-14 09:00:00+00:00', '2026-03-14 09:00:00+00:00'),
			(1, 1, 2000, 'mar14 evening', '2026-03-14 21:00:00+00:00', '2026-03-14 21:00:00+00:00'),
			(1, 1, 4000, 'mar15 morning', '2026-03-15 09:00:00+00:00', '2026-03-15 09:00:00+00:00'),
			(1, 1, 8000, 'mar15 evening', '2026-03-15 21:00:00+00:00', '2026-03-15 21:00:00+00:00');
	`
	if _, err := db.Exec(seed); err != nil {
		t.Fatalf("seed: %v", err)
	}

	return &expenseRepository{db: db}, 1
}

// period=today with no date previously dereferenced a nil customDate and panicked.
func TestOverviewTodayWithoutDateDoesNotPanic(t *testing.T) {
	repo, userID := overviewFixture(t)

	rows, err := repo.GetOverviewByCategory(context.Background(), userID, "today", nil)
	if err != nil {
		t.Fatalf("period=today with a nil date must not error: %v", err)
	}

	// "Today" is the real current date, and the fixture is dated March 2026, so
	// an empty result is correct — the point is that it returns at all.
	total := int64(0)
	for _, r := range rows {
		total += r.TotalAmount
	}
	t.Logf("rows=%d total=%d (fixture is dated 2026-03, so 0 is expected)", len(rows), total)
}

// With a date supplied, period=today must scope to exactly that UTC day and agree
// with the expense list's from/to pair for the same day.
func TestOverviewTodayMatchesListForSameDay(t *testing.T) {
	repo, userID := overviewFixture(t)

	day := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	rows, err := repo.GetOverviewByCategory(context.Background(), userID, "today", &day)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}

	var overviewTotal, overviewCount int64
	for _, r := range rows {
		overviewTotal += r.TotalAmount
		overviewCount += r.Count
	}

	total, err := repo.Sum(context.Background(), userID, ExpenseFilter{From: &day, To: &day})
	if err != nil {
		t.Fatalf("sum: %v", err)
	}

	if overviewTotal != total.TotalAmount {
		t.Errorf("overview total = %d, summary total = %d", overviewTotal, total.TotalAmount)
	}
	if overviewCount != total.TotalCount {
		t.Errorf("overview count = %d, summary count = %d", overviewCount, total.TotalCount)
	}

	if overviewTotal != 3000 || overviewCount != 2 {
		t.Errorf("got %d/%d for Mar 14, want 3000/2", overviewTotal, overviewCount)
	}
}

// month and year must keep working, and their totals must reconcile with the
// list rather than silently disagreeing.
func TestOverviewMonthAndYearReconcileWithList(t *testing.T) {
	repo, userID := overviewFixture(t)

	cases := []struct {
		period    string
		date      time.Time
		wantTotal int64
		wantCount int64
	}{
		{"month", time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC), 15000, 4},
		{"year", time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC), 15000, 4},
		// February has no fixture rows
		{"month", time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC), 0, 0},
		// Last year
		{"year", time.Date(2025, 3, 15, 0, 0, 0, 0, time.UTC), 0, 0},
	}

	for _, c := range cases {
		t.Run(c.period, func(t *testing.T) {
			rows, err := repo.GetOverviewByCategory(context.Background(), userID, c.period, &c.date)
			if err != nil {
				t.Fatalf("overview: %v", err)
			}

			var gotTotal, gotCount int64
			for _, r := range rows {
				gotTotal += r.TotalAmount
				gotCount += r.Count
			}

			if gotTotal != c.wantTotal {
				t.Errorf("total = %d, want %d", gotTotal, c.wantTotal)
			}
			if gotCount != c.wantCount {
				t.Errorf("count = %d, want %d", gotCount, c.wantCount)
			}
		})
	}
}

// An unknown period must be rejected rather than returning everything.
func TestOverviewRejectsUnknownPeriod(t *testing.T) {
	repo, userID := overviewFixture(t)

	if _, err := repo.GetOverviewByCategory(context.Background(), userID, "decade", nil); err == nil {
		t.Error("expected an error for an unknown period, got nil")
	}
}

// A date with a time component must still scope to that whole calendar day, not
// a single instant within it.
func TestOverviewTodayIgnoresTimeOfDayComponent(t *testing.T) {
	repo, userID := overviewFixture(t)

	// Mid-afternoon on Mar 14 should still include the 21:00 row.
	afternoon := time.Date(2026, 3, 14, 15, 30, 0, 0, time.UTC)
	rows, err := repo.GetOverviewByCategory(context.Background(), userID, "today", &afternoon)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}

	var total int64
	for _, r := range rows {
		total += r.TotalAmount
	}
	if total != 3000 {
		t.Errorf("total = %d, want 3000 (whole day regardless of time component)", total)
	}
}

// A date at UTC midnight must be interpreted as UTC, not shifted by the
// server's local zone.
func TestOverviewTodayUsesUTCNotServerLocal(t *testing.T) {
	repo, userID := overviewFixture(t)

	// An expense at 23:00 UTC on Mar 14 belongs to Mar 14 even though a
	// UTC+8 server would call it Mar 15.
	day := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	rows, err := repo.GetOverviewByCategory(context.Background(), userID, "today", &day)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}

	var count int64
	for _, r := range rows {
		count += r.Count
	}
	if count != 2 {
		t.Errorf("count = %d, want 2 (Mar 14 by UTC)", count)
	}
}
