#!/usr/bin/env node

/**
 * Fix duplicate setlist positions in the DMB Almanac database
 *
 * This script identifies setlist entries that have duplicate positions within
 * the same show and removes duplicates, keeping only the entry with the lowest ID.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/dmb-almanac.db');

interface DuplicateGroup {
  show_id: number;
  position: number;
  count: number;
}

interface SetlistEntry {
  id: number;
  show_id: number;
  song_id: number;
  position: number;
  set_name: string;
}

interface DeletionLog {
  show_id: number;
  position: number;
  kept_id: number;
  deleted_ids: number[];
  deleted_count: number;
}

function main() {
  console.log('='.repeat(80));
  console.log('DMB Almanac - Fix Duplicate Setlist Positions');
  console.log('='.repeat(80));
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  try {
    // Step 1: Find all duplicate position groups
    console.log('Step 1: Finding duplicate positions...');
    const duplicateGroups = db.prepare<[], DuplicateGroup>(`
      SELECT show_id, position, COUNT(*) as count
      FROM setlist_entries
      GROUP BY show_id, position
      HAVING COUNT(*) > 1
      ORDER BY show_id, position
    `).all();

    console.log(`Found ${duplicateGroups.length} duplicate position groups\n`);

    if (duplicateGroups.length === 0) {
      console.log('No duplicates found. Database is clean!');
      db.close();
      return;
    }

    // Step 2: Calculate total duplicates to delete
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0);
    console.log(`Total duplicate entries to delete: ${totalDuplicates}`);
    console.log(`Affected shows: ${new Set(duplicateGroups.map(g => g.show_id)).size}\n`);

    // Step 3: Process each duplicate group
    console.log('Step 2: Processing duplicates...\n');

    const deletionLogs: DeletionLog[] = [];
    let totalDeleted = 0;

    // Begin transaction
    const deleteStmt = db.prepare('DELETE FROM setlist_entries WHERE id = ?');
    const selectEntriesStmt = db.prepare<[number, number], SetlistEntry>(`
      SELECT id, show_id, song_id, position, set_name
      FROM setlist_entries
      WHERE show_id = ? AND position = ?
      ORDER BY id ASC
    `);

    db.transaction(() => {
      for (const group of duplicateGroups) {
        const entries = selectEntriesStmt.all(group.show_id, group.position);

        if (entries.length <= 1) {
          console.log(`⚠️  Show ${group.show_id} Position ${group.position}: No duplicates found (may have been resolved)`);
          continue;
        }

        // Keep the first entry (lowest ID), delete the rest
        const [kept, ...toDelete] = entries;
        const deletedIds: number[] = [];

        for (const entry of toDelete) {
          deleteStmt.run(entry.id);
          deletedIds.push(entry.id);
          totalDeleted++;
        }

        deletionLogs.push({
          show_id: group.show_id,
          position: group.position,
          kept_id: kept.id,
          deleted_ids: deletedIds,
          deleted_count: deletedIds.length
        });

        console.log(`✓ Show ${group.show_id} Position ${group.position}: Kept ID ${kept.id}, deleted ${deletedIds.length} duplicate(s) [${deletedIds.join(', ')}]`);
      }
    })();

    // Step 4: Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total duplicate entries deleted: ${totalDeleted}`);
    console.log(`Shows affected: ${new Set(deletionLogs.map(log => log.show_id)).size}`);
    console.log(`Position groups fixed: ${deletionLogs.length}`);

    // Step 5: Verify no duplicates remain
    console.log('\nStep 3: Verifying fix...');
    const remainingDuplicates = db.prepare<[], DuplicateGroup>(`
      SELECT show_id, position, COUNT(*) as count
      FROM setlist_entries
      GROUP BY show_id, position
      HAVING COUNT(*) > 1
    `).all();

    if (remainingDuplicates.length === 0) {
      console.log('✓ Verification passed: No duplicate positions remain\n');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist\n`);
    }

    // Step 6: Show detailed log
    console.log('\nDetailed Deletion Log:');
    console.log('-'.repeat(80));

    const showGroups = new Map<number, DeletionLog[]>();
    for (const log of deletionLogs) {
      if (!showGroups.has(log.show_id)) {
        showGroups.set(log.show_id, []);
      }
      showGroups.get(log.show_id)!.push(log);
    }

    for (const [show_id, logs] of showGroups) {
      console.log(`\nShow ${show_id}:`);
      for (const log of logs) {
        console.log(`  Position ${log.position}: Kept ID ${log.kept_id}, Deleted IDs: [${log.deleted_ids.join(', ')}]`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Fix completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the script
main();
