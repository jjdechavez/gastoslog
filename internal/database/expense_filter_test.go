package database

import (
	"strings"
	"testing"
	"time"
)

func mustParseDay(t *testing.T, s string) *time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("bad test date %q: %v", s, err)
	}
	return &parsed
}

func TestBuildWhere(t *testing.T) {
	tests := []struct {
		name string
		// filter drives the input; want* are hand-written expectations so a
		// regression in the date math can't quietly redefine them.
		filter ExpenseFilter
		// SQL conditions that must appear in the clause, in order.
		wantConds []string
		// Total bind args, including the leading user id.
		wantArgs int
		// UTC-midnight date bounds in clause order. The `to` bound is written as
		// the day AFTER the requested end: that is what makes the range
		// inclusive under a `<` comparison.
		wantDays []string
	}{
		{
			name:      "no filter scopes to the user only",
			filter:    ExpenseFilter{},
			wantConds: []string{"expenses.deleted_at IS NULL", "expenses.user_id = $1"},
			wantArgs:  1,
		},
		{
			name: "single day becomes a one-day inclusive window",
			filter: ExpenseFilter{
				From: mustParseDay(t, "2026-03-15"),
				To:   mustParseDay(t, "2026-03-15"),
			},
			wantConds: []string{"expenses.created_at >= $2", "expenses.created_at < $3"},
			wantArgs:  3,
			wantDays:  []string{"2026-03-15", "2026-03-16"},
		},
		{
			name: "multi-day range covers the final day in full",
			filter: ExpenseFilter{
				From: mustParseDay(t, "2026-03-01"),
				To:   mustParseDay(t, "2026-03-31"),
			},
			wantConds: []string{"expenses.created_at >= $2", "expenses.created_at < $3"},
			wantArgs:  3,
			wantDays:  []string{"2026-03-01", "2026-04-01"},
		},
		{
			name: "year boundary rolls the upper bound into the next year",
			filter: ExpenseFilter{
				From: mustParseDay(t, "2025-12-01"),
				To:   mustParseDay(t, "2025-12-31"),
			},
			wantConds: []string{"expenses.created_at >= $2", "expenses.created_at < $3"},
			wantArgs:  3,
			wantDays:  []string{"2025-12-01", "2026-01-01"},
		},
		{
			name: "leap day is a real bound, not an off-by-one",
			filter: ExpenseFilter{
				From: mustParseDay(t, "2028-02-28"),
				To:   mustParseDay(t, "2028-02-29"),
			},
			wantConds: []string{"expenses.created_at >= $2", "expenses.created_at < $3"},
			wantArgs:  3,
			wantDays:  []string{"2028-02-28", "2028-03-01"},
		},
		{
			name: "open-ended from leaves the upper bound off",
			filter: ExpenseFilter{
				From: mustParseDay(t, "2026-01-01"),
			},
			wantConds: []string{"expenses.created_at >= $2"},
			wantArgs:  2,
			wantDays:  []string{"2026-01-01"},
		},
		{
			name: "open-ended to uses the same numbering scheme",
			filter: ExpenseFilter{
				To: mustParseDay(t, "2026-12-31"),
			},
			wantConds: []string{"expenses.created_at < $2"},
			wantArgs:  2,
			wantDays:  []string{"2027-01-01"},
		},
		{
			name: "categories get one placeholder each, numbered after the date args",
			filter: ExpenseFilter{
				From:     mustParseDay(t, "2026-03-01"),
				Category: []int64{7, 9, 11},
			},
			wantConds: []string{
				"expenses.created_at >= $2",
				"expenses.category_id IN ($3,$4,$5)",
			},
			wantArgs: 5,
			wantDays: []string{"2026-03-01"},
		},
		{
			name: "categories without dates start their placeholders at $2",
			filter: ExpenseFilter{
				Category: []int64{4, 5},
			},
			wantConds: []string{"expenses.category_id IN ($2,$3)"},
			wantArgs:  3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			where, args := buildWhere(42, tt.filter)

			// The caller concatenates this straight after a FROM/JOIN, so it
			// has to carry its own leading space.
			if !strings.HasPrefix(where, " WHERE ") {
				t.Fatalf("clause must start with a leading space + WHERE, got %q", where)
			}
			for _, cond := range tt.wantConds {
				if !strings.Contains(where, cond) {
					t.Errorf("missing condition %q in %q", cond, where)
				}
			}
			if len(args) != tt.wantArgs {
				t.Fatalf("got %d args, want %d", len(args), tt.wantArgs)
			}
			if args[0] != int64(42) {
				t.Errorf("arg 0 = %v, want the user id 42", args[0])
			}

			var gotDays []string
			for _, a := range args[1:] {
				ts, ok := a.(time.Time)
				if !ok {
					continue
				}
				if ts.Location() != time.UTC || ts.Hour() != 0 || ts.Minute() != 0 || ts.Second() != 0 {
					t.Errorf("bound %v is not UTC midnight", ts)
				}
				gotDays = append(gotDays, ts.Format("2006-01-02"))
			}

			if len(gotDays) != len(tt.wantDays) {
				t.Fatalf("got date bounds %v, want %v", gotDays, tt.wantDays)
			}
			for i := range tt.wantDays {
				if gotDays[i] != tt.wantDays[i] {
					t.Errorf("date bound %d = %s, want %s", i, gotDays[i], tt.wantDays[i])
				}
			}
		})
	}
}

// startOfUTCDay must not be time.Time.Truncate(24h), which rounds relative to
// the zero time (year 1) rather than to a calendar day.
func TestStartOfUTCDayIsCalendarMidnight(t *testing.T) {
	in := time.Date(2026, 3, 15, 17, 45, 30, 123, time.UTC)
	got := startOfUTCDay(in)

	if got.Format("2006-01-02 15:04:05") != "2026-03-15 00:00:00" {
		t.Errorf("startOfUTCDay = %v, want 2026-03-15 00:00:00 UTC", got)
	}
	if !got.Before(in) {
		t.Error("startOfUTCDay must not move forward")
	}
}
