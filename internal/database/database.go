package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/mattn/go-sqlite3"
)

// Service represents a service that interacts with a database.
type Service interface {
	// Health returns a map of health status information.
	// The keys and values in the map are service-specific.
	Health() map[string]string

	// Close terminates the database connection.
	// It returns an error if the connection cannot be closed.
	Close() error

	UserRepository() UserRepository
	CategoryRepository() CategoryRepository
	ExpenseRepository() ExpenseRepository
	TargetRepository() TargetRepository
	TargetLogRepository() TargetLogRepository
}

type service struct {
	db *sqlx.DB
}

var (
	dburl      = os.Getenv("BLUEPRINT_DB_URL")
	dbInstance *service
)

func New() Service {
	// Reuse Connection
	if dbInstance != nil {
		return dbInstance
	}

	db, err := sqlx.Open("sqlite3", dburl)
	if err != nil {
		// This will not be a connection error, but a DSN parse error or
		// another initialization error.
		log.Fatal(err)
	}

	initializeSchema(db)

	dbInstance = &service{
		db: db,
	}
	return dbInstance
}

// Health checks the health of the database connection by pinging the database.
// It returns a map with keys indicating various health statistics.
func (s *service) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	stats := make(map[string]string)

	// Ping the database
	err := s.db.PingContext(ctx)
	if err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		log.Fatalf("db down: %v", err) // Log the error and terminate the program
		return stats
	}

	// Database is up, add more statistics
	stats["status"] = "up"
	stats["message"] = "It's healthy"

	// Get database stats (like open connections, in use, idle, etc.)
	dbStats := s.db.Stats()
	stats["open_connections"] = strconv.Itoa(dbStats.OpenConnections)
	stats["in_use"] = strconv.Itoa(dbStats.InUse)
	stats["idle"] = strconv.Itoa(dbStats.Idle)
	stats["wait_count"] = strconv.FormatInt(dbStats.WaitCount, 10)
	stats["wait_duration"] = dbStats.WaitDuration.String()
	stats["max_idle_closed"] = strconv.FormatInt(dbStats.MaxIdleClosed, 10)
	stats["max_lifetime_closed"] = strconv.FormatInt(dbStats.MaxLifetimeClosed, 10)

	// Evaluate stats to provide a health message
	if dbStats.OpenConnections > 40 { // Assuming 50 is the max for this example
		stats["message"] = "The database is experiencing heavy load."
	}

	if dbStats.WaitCount > 1000 {
		stats["message"] = "The database has a high number of wait events, indicating potential bottlenecks."
	}

	if dbStats.MaxIdleClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Many idle connections are being closed, consider revising the connection pool settings."
	}

	if dbStats.MaxLifetimeClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Many connections are being closed due to max lifetime, consider increasing max lifetime or revising the connection usage pattern."
	}

	return stats
}

// Close closes the database connection.
// It logs a message indicating the disconnection from the specific database.
// If the connection is successfully closed, it returns nil.
// If an error occurs while closing the connection, it returns the error.
func (s *service) Close() error {
	log.Printf("Disconnected from database: %s", dburl)
	return s.db.Close()
}

func (s *service) UserRepository() UserRepository {
	return NewUserRepository(s.db)
}

func (s *service) CategoryRepository() CategoryRepository {
	return NewCategoryRepository(s.db)
}

func (s *service) ExpenseRepository() ExpenseRepository {
	return NewExpenseRepository(s.db)
}

func (s *service) TargetRepository() TargetRepository {
	return NewTargetRepository(s.db)
}

func (s *service) TargetLogRepository() TargetLogRepository {
	return NewTargetLogRepository(s.db)
}

func initializeSchema(db *sqlx.DB) {
	userSchema := `-- Users table stores user account information
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
		email_verified_at DATETIME,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		last_login_at DATETIME
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
	CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
	CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login_at);
	`

	_, err := db.Exec(userSchema)
	if err != nil {
		log.Fatalf("Failed to initialize users table: %v", err)
	}

	categorySchema := `-- Categories table for user-specific expense categories
	CREATE TABLE IF NOT EXISTS categories (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at DATETIME,
		CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		CONSTRAINT unique_user_category UNIQUE (user_id, name)
	);

	CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories (user_id);
	CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);
	CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories (created_at);
	CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories (deleted_at);`

	_, err = db.Exec(categorySchema)
	if err != nil {
		log.Fatalf("Failed to initialize categories table: %v", err)
	}

	expenseSchema := `-- Expenses table for user-specific expense records
	CREATE TABLE IF NOT EXISTS expenses (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		category_id INTEGER NOT NULL,
		amount INTEGER NOT NULL,
		description TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at DATETIME,
		CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses (category_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses (created_at);
	CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses (deleted_at);
	-- Composite to cover the dominant expense query shape in one pass: scope to
	-- a user, order/scan by created_at. The single-column indexes above can't
	-- serve "this user's expenses in a date range, newest first" — SQLite would
	-- pick one index and either sort or filter.
	CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses (user_id, created_at);`

	_, err = db.Exec(expenseSchema)
	if err != nil {
		log.Fatalf("Failed to initialize expenses table: %v", err)
	}

	targetSchema := `-- Target table for user-specific expense records
	CREATE TABLE IF NOT EXISTS targets (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		target_amount INTEGER NOT NULL,
		type TEXT NOT NULL,
		direction TEXT NOT NULL,
		status TEXT NOT NULL,
		deadline_at DATETIME,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at DATETIME,
		CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_targets_user_id ON targets (user_id);
	CREATE INDEX IF NOT EXISTS idx_targets_type ON targets (type);
	CREATE INDEX IF NOT EXISTS idx_targets_direction ON targets (direction);
	CREATE INDEX IF NOT EXISTS idx_targets_created_at ON targets  (created_at);
	CREATE INDEX IF NOT EXISTS idx_targets_deleted_at ON targets (deleted_at);`

	_, err = db.Exec(targetSchema)
	if err != nil {
		log.Fatalf("Failed to initialize targets table: %v", err)
	}

	targetLogsSchema := `-- Target Logs table for user-specific expense records
	CREATE TABLE IF NOT EXISTS target_logs (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		target_id INTEGER NOT NULL,
		amount INTEGER NOT NULL,
		notes TEXT,
		entry_date DATETIME NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at DATETIME,
		CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		CONSTRAINT fk_target FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_target_logs_user_id ON target_logs (user_id);
	CREATE INDEX IF NOT EXISTS idx_target_logs_target_id ON target_logs (target_id);
	CREATE INDEX IF NOT EXISTS idx_target_logs_created_at ON target_logs (created_at);
	CREATE INDEX IF NOT EXISTS idx_target_logs_deleted_at ON target_logs (deleted_at);`

	_, err = db.Exec(targetLogsSchema)
	if err != nil {
		log.Fatalf("Failed to initialize target logs table: %v", err)
	}

	normalizeTimestamps(db)
}

// timestampColumns are the DATETIME columns that get normalised, per table.
//
// deleted_at is included: a soft-deleted row's timestamp still sorts
// inconsistently with UTC rows, and the WHERE guard leaves NULLs alone, so it
// needs the same treatment as the live columns.
var timestampColumns = map[string][]string{
	"users":       {"created_at", "updated_at", "email_verified_at", "last_login_at"},
	"categories":  {"created_at", "updated_at", "deleted_at"},
	"expenses":    {"created_at", "updated_at", "deleted_at"},
	"targets":     {"created_at", "updated_at", "deadline_at", "deleted_at"},
	"target_logs": {"created_at", "updated_at", "deleted_at"},
}

// normalizeTimestamps rewrites any stored timestamp that still carries a
// non-zero UTC offset into the equivalent UTC instant.
//
// Rows written before now() returned UTC were serialised with the server's local
// offset (e.g. "2025-05-05 13:55:27.750388+08:00"). SQLite compares DATETIME
// values as text, so those strings sorted by their wall-clock digits rather than
// by instant — which put late-evening expenses on the wrong day in range filters
// and broke the chronological ordering the indexes assume.
//
// The rewrite is idempotent (already-UTC values are unchanged) and preserves the
// instant exactly; only the textual representation changes. It runs at startup
// and is a no-op once the data is clean.
func normalizeTimestamps(db *sqlx.DB) {
	for table, columns := range timestampColumns {
		for _, column := range columns {
			// A stored value is off-UTC when it ends in an offset other than
			// +00:00. Written as an explicit suffix test rather than a numeric
			// one so a value that isn't parseable as a timestamp is never
			// touched.
			nonUTC := fmt.Sprintf(
				"(%[1]s IS NOT NULL AND (substr(%[1]s, -6) <> '+00:00' AND (substr(%[1]s, -6) LIKE '+__:__' OR substr(%[1]s, -6) LIKE '-__:__')))",
				column,
			)

			// strftime resolves an offset-aware value to its UTC instant on its
			// own — no 'utc_offset' modifier is needed, and passing one yields
			// NULL. The literal +00:00 suffix marks the result as UTC so
			// lexicographic order matches chronological order, and %S (not %f)
			// keeps the output identical to what a fresh write produces, since
			// go-sqlite3's layout omits an all-zero fractional part.
			stmt := fmt.Sprintf(`
				UPDATE %s
				SET %s = strftime('%%Y-%%m-%%d %%H:%%M:%%S+00:00', %[2]s)
				WHERE %[3]s
			`, table, column, column, nonUTC)

			result, err := db.Exec(stmt)
			if err != nil {
				// A failure means the data can't be normalised, so range filters
				// may be off for pre-existing rows. Log and continue — the app
				// still needs to start.
				log.Printf("Warning: could not normalize %s.%s to UTC: %v", table, column, err)
				continue
			}

			if affected, err := result.RowsAffected(); err == nil && affected > 0 {
				log.Printf("Normalized %d row(s) in %s.%s to UTC", affected, table, column)
			}
		}
	}
}
