package database

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

// newTestDB creates a throwaway in-memory database with the real schema, so the
// migration runs against the same DDL the app uses.
func newTestDB(t *testing.T) *sqlx.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := sqlx.Open("sqlite3", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	// Keep the shared in-memory DB alive for the duration of the test.
	db.SetConnMaxLifetime(0)
	if err := db.Ping(); err != nil {
		t.Fatalf("ping: %v", err)
	}

	initializeSchema(db)
	return db
}

// seedLegacyRows writes rows in the pre-fix format: a local offset instead of
// UTC, exactly what go-sqlite3 produced when the server ran outside UTC.
func seedLegacyRows(t *testing.T, db *sqlx.DB) {
	t.Helper()

	seed := `
		INSERT INTO users (id, email, password_hash, created_at, updated_at)
		VALUES (1, 'tz@test.local', 'x', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00');

		INSERT INTO categories (id, user_id, name, created_at, updated_at)
		VALUES (1, 1, 'Food', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00');

		INSERT INTO expenses (id, user_id, category_id, amount, created_at, updated_at) VALUES
			(1, 1, 1, 1000, '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00'),
			(2, 1, 1, 2000, '2026-03-15 20:00:00+08:00', '2026-03-15 20:00:00+08:00'),
			(3, 1, 1, 4000, '2026-03-16 06:00:00+08:00', '2026-03-16 06:00:00+08:00');

		INSERT INTO targets (id, user_id, name, target_amount, type, direction, status, deadline_at, created_at, updated_at)
		VALUES (1, 1, 'Goal', 500000, 'savings', 'inbound', 'active', '2026-04-01 00:00:00+08:00', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00');

		INSERT INTO target_logs (id, user_id, target_id, amount, entry_date, created_at, updated_at)
		VALUES (1, 1, 1, 1000, '2026-03-15 00:00:00+00:00', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00');
	`
	if _, err := db.Exec(seed); err != nil {
		t.Fatalf("seed: %v", err)
	}
}

// rawString reads a column as TEXT. go-sqlite3 parses declared DATETIME columns
// into time.Time before the scan, which would hide the exact string layout under
// test, so CAST forces the raw stored representation through.
func rawString(t *testing.T, db *sqlx.DB, query string, args ...any) string {
	t.Helper()
	var out string
	if err := db.Get(&out, query, args...); err != nil {
		if err == sql.ErrNoRows {
			return ""
		}
		t.Fatalf("query %q: %v", query, err)
	}
	return out
}

// The migration must rewrite every non-UTC timestamp to the same instant,
// expressed in UTC.
func TestNormalizeTimestampsRewritesEveryTable(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)

	normalizeTimestamps(db)

	checks := []struct {
		label string
		query string
		want  string
	}{
		// 07:00+08:00 == 23:00Z the previous day
		{"users.created_at", `SELECT CAST(created_at AS TEXT) FROM users WHERE id = 1`, "2026-03-14 23:00:00+00:00"},
		{"categories.created_at", `SELECT CAST(created_at AS TEXT) FROM categories WHERE id = 1`, "2026-03-14 23:00:00+00:00"},
		{"expenses 1 created_at", `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = 1`, "2026-03-14 23:00:00+00:00"},
		{"expenses 2 created_at", `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = 2`, "2026-03-15 12:00:00+00:00"},
		{"expenses 3 created_at", `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = 3`, "2026-03-15 22:00:00+00:00"},
		{"targets.deadline_at", `SELECT CAST(deadline_at AS TEXT) FROM targets WHERE id = 1`, "2026-03-31 16:00:00+00:00"},
		{"target_logs.created_at", `SELECT CAST(created_at AS TEXT) FROM target_logs WHERE id = 1`, "2026-03-14 23:00:00+00:00"},
	}

	for _, c := range checks {
		if got := rawString(t, db, c.query); got != c.want {
			t.Errorf("%s = %q, want %q", c.label, got, c.want)
		}
	}
}

// Rewriting must preserve the instant, not shift the data.
func TestNormalizeTimestampsPreservesInstants(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)

	before := map[int64]time.Time{}
	rows, err := db.Query(`SELECT id, CAST(created_at AS TEXT) FROM expenses ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var id int64
		var raw string
		if err := rows.Scan(&id, &raw); err != nil {
			t.Fatal(err)
		}
		ts, err := normalizeTimestamp(raw)
		if err != nil {
			t.Fatalf("id %d: %v", id, err)
		}
		before[id] = ts
	}
	rows.Close()

	normalizeTimestamps(db)

	for id, want := range before {
		raw := rawString(t, db, `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = ?`, id)
		got, err := normalizeTimestamp(raw)
		if err != nil {
			t.Fatalf("id %d: %v", id, err)
		}
		if !got.Equal(want) {
			t.Errorf("expense %d: instant moved %v -> %v", id, want, got)
		}
	}
}

// Idempotent: running at every startup must be a no-op once clean.
func TestNormalizeTimestampsIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)

	normalizeTimestamps(db)
	first := map[int64]string{}
	rows, _ := db.Query(`SELECT id, CAST(created_at AS TEXT) FROM expenses ORDER BY id`)
	for rows.Next() {
		var id int64
		var raw string
		rows.Scan(&id, &raw)
		first[id] = raw
	}
	rows.Close()

	normalizeTimestamps(db)
	normalizeTimestamps(db)

	for id, want := range first {
		if got := rawString(t, db, `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = ?`, id); got != want {
			t.Errorf("expense %d changed on re-run: %q -> %q", id, want, got)
		}
	}
}

// The whole point: after normalising, a range filter on the UTC day now matches
// the row that the legacy string misplaced.
func TestRangeFilterRespectsUTCAfterNormalization(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)
	normalizeTimestamps(db)

	repo := NewExpenseRepository(db)

	// Expense 1 is 2026-03-14T23:00Z — it belongs to the 14th.
	filterFrom := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	filterTo := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)

	list, err := repo.List(context.Background(), ListExpenseInput{
		UserID:        1,
		Page:          1,
		Limit:         10,
		ExpenseFilter: ExpenseFilter{From: &filterFrom, To: &filterTo},
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("got %d rows for the Mar 14 window, want 1", len(list))
	}
	if list[0].ID != 1 {
		t.Errorf("got expense %d, want 1", list[0].ID)
	}

	// And the aggregate agrees with the list.
	total, err := repo.Sum(context.Background(), 1, ExpenseFilter{From: &filterFrom, To: &filterTo})
	if err != nil {
		t.Fatalf("sum: %v", err)
	}
	if total.TotalCount != 1 || total.TotalAmount != 1000 {
		t.Errorf("sum = %+v, want count=1 amount=1000", total)
	}
}

// Before the fix this same query returned nothing, because the string
// "2026-03-15 07:00:00+08:00" sorted outside the Mar 14 window.
func TestRangeFilterWasBrokenBeforeNormalization(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)
	// Deliberately NOT normalized.

	repo := NewExpenseRepository(db)
	filterFrom := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	filterTo := filterFrom

	list, err := repo.List(context.Background(), ListExpenseInput{
		UserID:        1,
		Page:          1,
		Limit:         10,
		ExpenseFilter: ExpenseFilter{From: &filterFrom, To: &filterTo},
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 0 {
		t.Logf("note: legacy data happened to match (%d rows)", len(list))
	} else {
		t.Log("confirmed: the legacy +08:00 row was invisible to a Mar 14 filter")
	}
}

// Chronological ordering must hold once every value is UTC — the composite index
// and the half-open comparisons both depend on it.
func TestNormalizedRowsOrderChronologically(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)
	normalizeTimestamps(db)

	var stamps []string
	rows, err := db.Query(`SELECT CAST(created_at AS TEXT) FROM expenses ORDER BY created_at`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			t.Fatal(err)
		}
		stamps = append(stamps, raw)
	}

	if len(stamps) != 3 {
		t.Fatalf("got %d rows, want 3", len(stamps))
	}
	for i := 1; i < len(stamps); i++ {
		prev, err := normalizeTimestamp(stamps[i-1])
		if err != nil {
			t.Fatal(err)
		}
		cur, err := normalizeTimestamp(stamps[i])
		if err != nil {
			t.Fatal(err)
		}
		if !prev.Before(cur) {
			t.Errorf("row %d (%v) should sort before row %d (%v)", i-1, prev, i, cur)
		}
	}
}

// New writes must already be UTC, so no second migration pass is needed.
func TestNewWritesAreUTC(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)
	normalizeTimestamps(db)

	repo := NewExpenseRepository(db)
	created, err := repo.Create(context.Background(), NewExpenseInput{
		UserID: 1, CategoryID: 1, Amount: 500, Description: "fresh",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.CreatedAt.Location() != time.UTC {
		t.Errorf("CreatedAt location = %v, want UTC", created.CreatedAt)
	}

	raw := rawString(t, db, `SELECT CAST(created_at AS TEXT) FROM expenses WHERE id = ?`, created.ID)
	if len(raw) < 6 || raw[len(raw)-6:] != "+00:00" {
		t.Errorf("stored new row = %q, want a +00:00 offset", raw)
	}
}

// NULL timestamps must stay NULL rather than becoming a bogus date.
// users.updated_at is NOT NULL, so use a genuinely nullable column:
// email_verified_at / last_login_at, and expenses.deleted_at.
func TestNullTimestampsSurviveNormalization(t *testing.T) {
	db := newTestDB(t)

	if _, err := db.Exec(`
		INSERT INTO users (id, email, password_hash, created_at, updated_at, email_verified_at, last_login_at)
		VALUES (1, 'null@test.local', 'x', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00', NULL, NULL);

		INSERT INTO categories (id, user_id, name, created_at, updated_at)
		VALUES (1, 1, 'Food', '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00');

		INSERT INTO expenses (id, user_id, category_id, amount, created_at, updated_at, deleted_at)
		VALUES (1, 1, 1, 1000, '2026-03-15 07:00:00+08:00', '2026-03-15 07:00:00+08:00', NULL);
	`); err != nil {
		t.Fatal(err)
	}

	normalizeTimestamps(db)

	var verifiedAt, lastLoginAt, deletedAt sql.NullString
	if err := db.Get(&verifiedAt, `SELECT email_verified_at FROM users WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	if err := db.Get(&lastLoginAt, `SELECT last_login_at FROM users WHERE id = 1`); err != nil {
		t.Fatal(err)
	}
	if err := db.Get(&deletedAt, `SELECT deleted_at FROM expenses WHERE id = 1`); err != nil {
		t.Fatal(err)
	}

	if verifiedAt.Valid {
		t.Errorf("email_verified_at = %q, want NULL preserved", verifiedAt.String)
	}
	if lastLoginAt.Valid {
		t.Errorf("last_login_at = %q, want NULL preserved", lastLoginAt.String)
	}
	if deletedAt.Valid {
		t.Errorf("expenses.deleted_at = %q, want NULL preserved", deletedAt.String)
	}
}

// A soft-deleted expense (non-NULL deleted_at, legacy offset) must be rewritten
// too, and must stay excluded from normal queries.
func TestSoftDeletedRowsAreNormalizedAndStillExcluded(t *testing.T) {
	db := newTestDB(t)
	seedLegacyRows(t, db)

	if _, err := db.Exec(`
		UPDATE expenses SET deleted_at = '2026-03-20 10:00:00+08:00' WHERE id = 2
	`); err != nil {
		t.Fatal(err)
	}

	normalizeTimestamps(db)

	if got := rawString(t, db, `SELECT CAST(deleted_at AS TEXT) FROM expenses WHERE id = 2`); got != "2026-03-20 02:00:00+00:00" {
		t.Errorf("deleted_at = %q, want 2026-03-20 02:00:00+00:00", got)
	}

	// Still invisible to List and to Sum.
	repo := NewExpenseRepository(db)
	list, err := repo.List(context.Background(), ListExpenseInput{UserID: 1, Page: 1, Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range list {
		if e.ID == 2 {
			t.Error("soft-deleted expense 2 should not appear in List")
		}
	}

	total, err := repo.Sum(context.Background(), 1, ExpenseFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if total.TotalAmount != 5000 {
		t.Errorf("sum = %d, want 5000 (rows 1 and 3 only)", total.TotalAmount)
	}
}
