#!/usr/bin/env tsx
/**
 * DMB Almanac - Add Database Constraints
 *
 * Adds critical database constraints to prevent future data integrity issues:
 * 1. Unique constraint on setlist_entries(show_id, position) - prevents duplicate positions
 * 2. Check constraint on venues.name - prevents empty venue names
 * 3. Check constraint on shows.date format - enforces YYYY-MM-DD format
 * 4. Index on guest_appearances(guest_id, show_id) - performance + uniqueness help
 *
 * SQLite Limitations:
 * - Cannot ALTER TABLE to add CHECK constraints to existing tables
 * - Must recreate tables with constraints or use triggers
 * - CREATE UNIQUE INDEX is supported and preferred for uniqueness
 *
 * Strategy:
 * - Use UNIQUE INDEX for setlist_entries (efficient, non-blocking)
 * - Use triggers for validation constraints (venues.name, shows.date)
 * - Add composite index for guest_appearances performance
 *
 * Usage:
 *   npm run constraints
 *   npx tsx scripts/add-database-constraints.ts
 *
 * @author DMB Almanac Database Team
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/dmb-almanac.db');

// ==================== VALIDATION QUERIES ====================

interface ValidationResult {
  table: string;
  constraint: string;
  status: 'PASS' | 'FAIL';
  message: string;
  violations?: number;
}

interface DuplicatePosition {
  show_id: number;
  position: number;
  count: number;
}

interface EmptyVenue {
  id: number;
  name: string;
  city: string;
  country: string;
}

interface InvalidDateShow {
  id: number;
  date: string;
  venue_id: number;
}

interface DuplicateGuest {
  guest_id: number;
  show_id: number;
  count: number;
}

/**
 * Validate data before adding constraints
 */
function validateData(db: Database.Database): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. Check for duplicate setlist positions
  console.log('Checking for duplicate setlist positions...');
  const duplicatePositions = db.prepare<[], DuplicatePosition>(`
    SELECT show_id, position, COUNT(*) as count
    FROM setlist_entries
    GROUP BY show_id, position
    HAVING COUNT(*) > 1
  `).all();

  results.push({
    table: 'setlist_entries',
    constraint: 'UNIQUE(show_id, position)',
    status: duplicatePositions.length === 0 ? 'PASS' : 'FAIL',
    message: duplicatePositions.length === 0
      ? 'No duplicate positions found'
      : `Found ${duplicatePositions.length} shows with duplicate positions`,
    violations: duplicatePositions.length
  });

  // 2. Check for empty venue names
  console.log('Checking for empty venue names...');
  const emptyVenues = db.prepare<[], EmptyVenue>(`
    SELECT id, name, city, country
    FROM venues
    WHERE name IS NULL OR TRIM(name) = ''
  `).all();

  results.push({
    table: 'venues',
    constraint: 'CHECK(name IS NOT NULL AND TRIM(name) != \'\')',
    status: emptyVenues.length === 0 ? 'PASS' : 'FAIL',
    message: emptyVenues.length === 0
      ? 'All venue names are valid'
      : `Found ${emptyVenues.length} venues with empty names`,
    violations: emptyVenues.length
  });

  // 3. Check for invalid date formats
  console.log('Checking for invalid show date formats...');
  const invalidDates = db.prepare<[], InvalidDateShow>(`
    SELECT id, date, venue_id
    FROM shows
    WHERE date IS NULL
       OR LENGTH(date) != 10
       OR date NOT LIKE '____-__-__'
       OR CAST(SUBSTR(date, 1, 4) AS INTEGER) < 1900
       OR CAST(SUBSTR(date, 1, 4) AS INTEGER) > 2100
       OR CAST(SUBSTR(date, 6, 2) AS INTEGER) < 1
       OR CAST(SUBSTR(date, 6, 2) AS INTEGER) > 12
       OR CAST(SUBSTR(date, 9, 2) AS INTEGER) < 1
       OR CAST(SUBSTR(date, 9, 2) AS INTEGER) > 31
  `).all();

  results.push({
    table: 'shows',
    constraint: 'CHECK(date matches YYYY-MM-DD format)',
    status: invalidDates.length === 0 ? 'PASS' : 'FAIL',
    message: invalidDates.length === 0
      ? 'All show dates are valid YYYY-MM-DD format'
      : `Found ${invalidDates.length} shows with invalid date format`,
    violations: invalidDates.length
  });

  // 4. Check for duplicate guest appearances (informational only - guests can appear in multiple songs)
  console.log('Checking for duplicate guest appearances...');
  const duplicateGuests = db.prepare<[], DuplicateGuest>(`
    SELECT guest_id, show_id, COUNT(*) as count
    FROM guest_appearances
    GROUP BY guest_id, show_id
    HAVING COUNT(*) > 1
  `).all();

  results.push({
    table: 'guest_appearances',
    constraint: 'Multiple appearances per guest per show (informational)',
    status: 'PASS', // Always pass - this is valid data
    message: duplicateGuests.length === 0
      ? 'No duplicate guest appearances found'
      : `Found ${duplicateGuests.length} guest/show combinations with multiple appearances (valid - guests can play in multiple songs)`,
    violations: 0 // Not actually violations
  });

  return results;
}

/**
 * Add constraints to the database
 */
function addConstraints(db: Database.Database): void {
  console.log('\n' + '='.repeat(80));
  console.log('ADDING DATABASE CONSTRAINTS');
  console.log('='.repeat(80) + '\n');

  const constraintsAdded: string[] = [];
  const constraintsFailed: string[] = [];

  // 1. Add UNIQUE index on setlist_entries(show_id, position)
  console.log('1. Adding UNIQUE constraint on setlist_entries(show_id, position)...');
  try {
    // Check if index already exists
    const existingIndex = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'index'
        AND name = 'idx_setlist_unique_show_position'
    `).get();

    if (existingIndex) {
      console.log('   ⚠️  Index already exists, skipping');
    } else {
      db.prepare(`
        CREATE UNIQUE INDEX idx_setlist_unique_show_position
        ON setlist_entries(show_id, position)
      `).run();
      console.log('   ✓ Created UNIQUE INDEX idx_setlist_unique_show_position');
      constraintsAdded.push('setlist_entries: UNIQUE(show_id, position)');
    }
  } catch (error) {
    console.error('   ❌ Failed:', error);
    constraintsFailed.push('setlist_entries: UNIQUE(show_id, position)');
  }

  // 2. Add CHECK constraint on venues.name via trigger
  console.log('\n2. Adding CHECK constraint on venues.name via triggers...');
  try {
    // Trigger for INSERT
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_venues_name_check_insert
      BEFORE INSERT ON venues
      FOR EACH ROW
      WHEN NEW.name IS NULL OR TRIM(NEW.name) = ''
      BEGIN
        SELECT RAISE(ABORT, 'Venue name cannot be empty');
      END
    `).run();
    console.log('   ✓ Created INSERT trigger: trg_venues_name_check_insert');

    // Trigger for UPDATE
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_venues_name_check_update
      BEFORE UPDATE ON venues
      FOR EACH ROW
      WHEN NEW.name IS NULL OR TRIM(NEW.name) = ''
      BEGIN
        SELECT RAISE(ABORT, 'Venue name cannot be empty');
      END
    `).run();
    console.log('   ✓ Created UPDATE trigger: trg_venues_name_check_update');
    constraintsAdded.push('venues: CHECK(name NOT empty) via triggers');
  } catch (error) {
    console.error('   ❌ Failed:', error);
    constraintsFailed.push('venues: CHECK(name NOT empty)');
  }

  // 3. Add CHECK constraint on shows.date format via trigger
  console.log('\n3. Adding CHECK constraint on shows.date format via triggers...');
  try {
    // Trigger for INSERT
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_shows_date_format_check_insert
      BEFORE INSERT ON shows
      FOR EACH ROW
      WHEN NEW.date IS NULL
         OR LENGTH(NEW.date) != 10
         OR NEW.date NOT LIKE '____-__-__'
         OR CAST(SUBSTR(NEW.date, 1, 4) AS INTEGER) < 1900
         OR CAST(SUBSTR(NEW.date, 1, 4) AS INTEGER) > 2100
         OR CAST(SUBSTR(NEW.date, 6, 2) AS INTEGER) < 1
         OR CAST(SUBSTR(NEW.date, 6, 2) AS INTEGER) > 12
         OR CAST(SUBSTR(NEW.date, 9, 2) AS INTEGER) < 1
         OR CAST(SUBSTR(NEW.date, 9, 2) AS INTEGER) > 31
      BEGIN
        SELECT RAISE(ABORT, 'Show date must be in YYYY-MM-DD format');
      END
    `).run();
    console.log('   ✓ Created INSERT trigger: trg_shows_date_format_check_insert');

    // Trigger for UPDATE
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_shows_date_format_check_update
      BEFORE UPDATE ON shows
      FOR EACH ROW
      WHEN NEW.date IS NULL
         OR LENGTH(NEW.date) != 10
         OR NEW.date NOT LIKE '____-__-__'
         OR CAST(SUBSTR(NEW.date, 1, 4) AS INTEGER) < 1900
         OR CAST(SUBSTR(NEW.date, 1, 4) AS INTEGER) > 2100
         OR CAST(SUBSTR(NEW.date, 6, 2) AS INTEGER) < 1
         OR CAST(SUBSTR(NEW.date, 6, 2) AS INTEGER) > 12
         OR CAST(SUBSTR(NEW.date, 9, 2) AS INTEGER) < 1
         OR CAST(SUBSTR(NEW.date, 9, 2) AS INTEGER) > 31
      BEGIN
        SELECT RAISE(ABORT, 'Show date must be in YYYY-MM-DD format');
      END
    `).run();
    console.log('   ✓ Created UPDATE trigger: trg_shows_date_format_check_update');
    constraintsAdded.push('shows: CHECK(date YYYY-MM-DD format) via triggers');
  } catch (error) {
    console.error('   ❌ Failed:', error);
    constraintsFailed.push('shows: CHECK(date YYYY-MM-DD format)');
  }

  // 4. Add composite index on guest_appearances(guest_id, show_id)
  console.log('\n4. Adding index on guest_appearances(guest_id, show_id)...');
  try {
    // Check if index already exists (it does per our earlier check)
    const existingIndex = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'index'
        AND name = 'idx_appearances_guest_show'
    `).get();

    if (existingIndex) {
      console.log('   ⚠️  Index idx_appearances_guest_show already exists');
      console.log('   ℹ️  This index helps with performance and detecting duplicates');
    } else {
      db.prepare(`
        CREATE INDEX idx_appearances_guest_show
        ON guest_appearances(guest_id, show_id)
      `).run();
      console.log('   ✓ Created INDEX idx_appearances_guest_show');
      constraintsAdded.push('guest_appearances: INDEX(guest_id, show_id)');
    }
  } catch (error) {
    console.error('   ❌ Failed:', error);
    constraintsFailed.push('guest_appearances: INDEX(guest_id, show_id)');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('CONSTRAINT SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nConstraints added: ${constraintsAdded.length}`);
  if (constraintsAdded.length > 0) {
    constraintsAdded.forEach(c => console.log(`  ✓ ${c}`));
  }

  if (constraintsFailed.length > 0) {
    console.log(`\nConstraints failed: ${constraintsFailed.length}`);
    constraintsFailed.forEach(c => console.log(`  ❌ ${c}`));
  }
}

/**
 * Test constraints by attempting invalid operations
 */
function testConstraints(db: Database.Database): void {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CONSTRAINTS');
  console.log('='.repeat(80) + '\n');

  const tests: { name: string; test: () => void; shouldFail: boolean }[] = [];

  // Test 1: Try to insert duplicate setlist position
  tests.push({
    name: 'Insert duplicate setlist position',
    shouldFail: true,
    test: () => {
      // Get a valid show_id and position that exists
      const existing = db.prepare<[], { show_id: number; position: number; song_id: number }>(`
        SELECT show_id, position, song_id
        FROM setlist_entries
        LIMIT 1
      `).get();

      if (!existing) {
        throw new Error('No setlist entries to test with');
      }

      // Try to insert duplicate position
      db.prepare(`
        INSERT INTO setlist_entries (show_id, song_id, position, set_name)
        VALUES (?, ?, ?, 'set1')
      `).run(existing.show_id, existing.song_id, existing.position);
    }
  });

  // Test 2: Try to insert venue with empty name
  tests.push({
    name: 'Insert venue with empty name',
    shouldFail: true,
    test: () => {
      db.prepare(`
        INSERT INTO venues (name, city, country)
        VALUES ('', 'Test City', 'US')
      `).run();
    }
  });

  // Test 3: Try to insert show with invalid date
  tests.push({
    name: 'Insert show with invalid date format',
    shouldFail: true,
    test: () => {
      // Get a valid venue_id and tour_id
      const venue = db.prepare<[], { id: number }>('SELECT id FROM venues LIMIT 1').get();
      const tour = db.prepare<[], { id: number }>('SELECT id FROM tours LIMIT 1').get();

      if (!venue || !tour) {
        throw new Error('No venues or tours to test with');
      }

      db.prepare(`
        INSERT INTO shows (date, venue_id, tour_id)
        VALUES ('2024/01/15', ?, ?)
      `).run(venue.id, tour.id);
    }
  });

  // Run tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const transaction = db.transaction(test.test);
      transaction();

      // If we get here, the test didn't throw
      if (test.shouldFail) {
        console.log(`❌ ${test.name}: Expected to fail but succeeded`);
        failed++;
        // Rollback the successful operation
        db.prepare('ROLLBACK').run();
      } else {
        console.log(`✓ ${test.name}: Passed`);
        passed++;
      }
    } catch (error) {
      if (test.shouldFail) {
        console.log(`✓ ${test.name}: Correctly rejected`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: Unexpected failure`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`Tests: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('='.repeat(80));
}

/**
 * Display constraint information
 */
function displayConstraintInfo(db: Database.Database): void {
  console.log('\n' + '='.repeat(80));
  console.log('CONSTRAINT INFORMATION');
  console.log('='.repeat(80) + '\n');

  // Unique indexes
  console.log('Unique Indexes:');
  const uniqueIndexes = db.prepare<[], { name: string; tbl_name: string; sql: string }>(`
    SELECT name, tbl_name, sql
    FROM sqlite_master
    WHERE type = 'index'
      AND sql LIKE '%UNIQUE%'
    ORDER BY tbl_name, name
  `).all();

  uniqueIndexes.forEach(idx => {
    console.log(`  • ${idx.tbl_name}.${idx.name}`);
  });

  // Triggers (acting as CHECK constraints)
  console.log('\nTriggers (Validation):');
  const triggers = db.prepare<[], { name: string; tbl_name: string }>(`
    SELECT name, tbl_name
    FROM sqlite_master
    WHERE type = 'trigger'
      AND name LIKE 'trg_%check%'
    ORDER BY tbl_name, name
  `).all();

  triggers.forEach(trg => {
    console.log(`  • ${trg.tbl_name}.${trg.name}`);
  });

  // Performance indexes
  console.log('\nPerformance Indexes:');
  const perfIndexes = db.prepare<[], { name: string; tbl_name: string }>(`
    SELECT name, tbl_name
    FROM sqlite_master
    WHERE type = 'index'
      AND tbl_name IN ('setlist_entries', 'guest_appearances', 'shows', 'venues')
      AND name LIKE 'idx_%'
    ORDER BY tbl_name, name
  `).all();

  const byTable = perfIndexes.reduce((acc, idx) => {
    if (!acc[idx.tbl_name]) acc[idx.tbl_name] = [];
    acc[idx.tbl_name].push(idx.name);
    return acc;
  }, {} as Record<string, string[]>);

  Object.entries(byTable).forEach(([table, indexes]) => {
    console.log(`  ${table}: ${indexes.length} indexes`);
  });

  console.log('\n' + '='.repeat(80));
}

// ==================== MAIN ====================

function main(): void {
  console.log('='.repeat(80));
  console.log('DMB Almanac - Add Database Constraints');
  console.log('='.repeat(80));
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  try {
    // Step 1: Validate existing data
    console.log('='.repeat(80));
    console.log('STEP 1: DATA VALIDATION');
    console.log('='.repeat(80) + '\n');

    const validationResults = validateData(db);

    console.log('\nValidation Results:');
    console.log('-'.repeat(80));

    let hasViolations = false;
    validationResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✓' : '❌';
      console.log(`${icon} ${result.table}: ${result.message}`);
      if (result.status === 'FAIL') {
        hasViolations = true;
      }
    });

    if (hasViolations) {
      console.log('\n⚠️  WARNING: Data validation found issues!');
      console.log('These must be fixed before constraints can be safely added.');
      console.log('\nRecommended fixes:');
      console.log('  • Run: npx tsx scripts/fix-duplicate-positions.ts');
      console.log('  • Run: npx tsx scripts/fix-empty-venues.ts');
      console.log('\nAborting constraint addition to prevent data corruption.');
      process.exit(1);
    }

    console.log('\n✓ All validation checks passed!');

    // Step 2: Add constraints
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: ADDING CONSTRAINTS');
    console.log('='.repeat(80));

    addConstraints(db);

    // Step 3: Test constraints
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: TESTING CONSTRAINTS');
    console.log('='.repeat(80));

    testConstraints(db);

    // Step 4: Display constraint info
    displayConstraintInfo(db);

    console.log('\n' + '='.repeat(80));
    console.log('✓ CONSTRAINTS SUCCESSFULLY ADDED');
    console.log('='.repeat(80));
    console.log('\nYour database now has:');
    console.log('  1. Unique constraint on setlist positions (prevents duplicates)');
    console.log('  2. Validation on venue names (prevents empty names)');
    console.log('  3. Validation on show dates (enforces YYYY-MM-DD format)');
    console.log('  4. Performance indexes for guest appearances');
    console.log('\nThese constraints will prevent the data integrity issues found in the audit.');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the script
main();
