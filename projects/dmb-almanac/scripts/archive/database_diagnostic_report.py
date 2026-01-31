#!/usr/bin/env python3
"""
DMB Almanac Database Diagnostic Report
Analyzes setlist coverage and identifies data gaps
"""

import sqlite3
import sys
from datetime import datetime

DB_PATH = "/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/dmb-almanac/app/data/dmb-almanac.db"

def connect_db():
    """Connect to the database"""
    return sqlite3.connect(DB_PATH)

def overall_statistics(conn):
    """Get overall setlist coverage statistics"""
    query = """
    SELECT
        COUNT(*) as total_shows,
        COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as shows_with_setlists,
        COUNT(*) - COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as shows_without_setlists
    FROM shows
    """
    cursor = conn.execute(query)
    row = cursor.fetchone()

    total = row[0]
    with_setlists = row[1]
    without = row[2]
    coverage = (with_setlists / total * 100) if total > 0 else 0

    print("=" * 80)
    print("DMB ALMANAC DATABASE DIAGNOSTIC REPORT")
    print("=" * 80)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("OVERALL STATISTICS")
    print("-" * 80)
    print(f"Total Shows:              {total:,}")
    print(f"Shows WITH Setlists:      {with_setlists:,}")
    print(f"Shows WITHOUT Setlists:   {without:,}")
    print(f"Coverage Percentage:      {coverage:.2f}%")
    print()

def year_by_year_coverage(conn):
    """Analyze setlist coverage by year"""
    query = """
    SELECT
        CAST(strftime('%Y', date) AS INTEGER) as year,
        COUNT(*) as total_shows,
        COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as shows_with_setlists,
        COUNT(*) - COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as shows_without_setlists
    FROM shows
    GROUP BY year
    ORDER BY year
    """

    print("YEAR-BY-YEAR COVERAGE ANALYSIS")
    print("-" * 80)
    print(f"{'Year':<6} {'Total':>7} {'With':>7} {'Missing':>8} {'Coverage':>10}")
    print("-" * 80)

    cursor = conn.execute(query)
    for row in cursor:
        year, total, with_setlists, without = row
        coverage = (with_setlists / total * 100) if total > 0 else 0
        print(f"{year:<6} {total:>7,} {with_setlists:>7,} {without:>8,} {coverage:>9.2f}%")
    print()

def problematic_years(conn):
    """Identify years needing re-scraping (less than 100% coverage)"""
    query = """
    SELECT
        CAST(strftime('%Y', date) AS INTEGER) as year,
        COUNT(*) as total_shows,
        COUNT(*) - COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as missing_setlists,
        ROUND(
            100.0 * COUNT(DISTINCT CASE
                WHEN EXISTS (
                    SELECT 1 FROM setlist_entries se
                    WHERE se.show_id = shows.id
                ) THEN shows.id
            END) / COUNT(*),
            2
        ) as coverage_percentage
    FROM shows
    GROUP BY year
    HAVING missing_setlists > 0
    ORDER BY missing_setlists DESC, year
    """

    print("PROBLEMATIC YEARS (PRIORITY ORDER)")
    print("-" * 80)
    print("Years ranked by number of missing setlists (highest first)")
    print()
    print(f"{'Year':<6} {'Total':>7} {'Missing':>8} {'Coverage':>10} {'Priority':>10}")
    print("-" * 80)

    cursor = conn.execute(query)
    rows = cursor.fetchall()

    for idx, row in enumerate(rows, 1):
        year, total, missing, coverage = row

        # Determine priority
        if missing > 100:
            priority = "CRITICAL"
        elif missing > 50:
            priority = "HIGH"
        elif missing > 10:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        print(f"{year:<6} {total:>7,} {missing:>8,} {coverage:>9.2f}% {priority:>10}")
    print()

def setlist_statistics(conn):
    """Get statistics about setlist entries"""
    query = """
    SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT show_id) as shows_with_entries,
        ROUND(AVG(songs_per_show), 2) as avg_songs,
        MIN(songs_per_show) as min_songs,
        MAX(songs_per_show) as max_songs
    FROM (
        SELECT show_id, COUNT(*) as songs_per_show
        FROM setlist_entries
        GROUP BY show_id
    )
    """

    cursor = conn.execute(query)
    row = cursor.fetchone()

    print("SETLIST ENTRY STATISTICS")
    print("-" * 80)
    print(f"Total Setlist Entries:     {row[0]:,}")
    print(f"Shows with Entries:        {row[1]:,}")
    print(f"Average Songs per Show:    {row[2]}")
    print(f"Min Songs per Show:        {row[3]}")
    print(f"Max Songs per Show:        {row[4]}")
    print()

def suspicious_shows(conn):
    """Shows with unusually low song counts (potential data issues)"""
    query = """
    SELECT
        s.id,
        s.date,
        CAST(strftime('%Y', s.date) AS INTEGER) as year,
        v.name as venue_name,
        v.city,
        v.state,
        COUNT(se.id) as song_count
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    JOIN setlist_entries se ON s.id = se.show_id
    GROUP BY s.id
    HAVING song_count < 5
    ORDER BY s.date
    """

    cursor = conn.execute(query)
    rows = cursor.fetchall()

    if rows:
        print("SUSPICIOUS SHOWS (Less than 5 songs - possible incomplete data)")
        print("-" * 80)
        print(f"{'ID':<7} {'Date':<12} {'Songs':>6} {'Venue':<40} {'City/State'}")
        print("-" * 80)

        for row in rows:
            show_id, date, year, venue, city, state, count = row
            location = f"{city}, {state}" if state else city
            print(f"{show_id:<7} {date:<12} {count:>6} {venue[:40]:<40} {location}")
        print()
    else:
        print("SUSPICIOUS SHOWS")
        print("-" * 80)
        print("No shows found with unusually low song counts.")
        print()

def recent_shows_status(conn):
    """Status of recent shows (last 24 months)"""
    query = """
    SELECT
        s.id,
        s.date,
        v.name as venue_name,
        v.city,
        v.state,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = s.id
            ) THEN 'YES'
            ELSE 'NO'
        END as has_setlist,
        COALESCE((SELECT COUNT(*) FROM setlist_entries se WHERE se.show_id = s.id), 0) as song_count
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.date >= date('now', '-24 months')
    ORDER BY s.date DESC
    """

    cursor = conn.execute(query)
    rows = cursor.fetchall()

    if rows:
        print("RECENT SHOWS STATUS (Last 24 months)")
        print("-" * 80)
        print(f"{'ID':<7} {'Date':<12} {'Setlist':>8} {'Songs':>6} {'Venue':<35} {'Location'}")
        print("-" * 80)

        missing_count = 0
        for row in rows:
            show_id, date, venue, city, state, has_setlist, count = row
            location = f"{city}, {state}" if state else city

            if has_setlist == 'NO':
                missing_count += 1
                marker = "**MISSING**"
            else:
                marker = has_setlist

            print(f"{show_id:<7} {date:<12} {marker:>8} {count:>6} {venue[:35]:<35} {location}")

        print()
        print(f"Recent shows missing setlists: {missing_count} of {len(rows)}")
        print()
    else:
        print("RECENT SHOWS STATUS")
        print("-" * 80)
        print("No shows found in the last 24 months.")
        print()

def scraping_recommendations(conn):
    """Generate recommendations for re-scraping"""
    query = """
    SELECT
        CAST(strftime('%Y', date) AS INTEGER) as year,
        COUNT(*) as total_shows,
        COUNT(*) - COUNT(DISTINCT CASE
            WHEN EXISTS (
                SELECT 1 FROM setlist_entries se
                WHERE se.show_id = shows.id
            ) THEN shows.id
        END) as missing_setlists
    FROM shows
    GROUP BY year
    HAVING missing_setlists > 0
    ORDER BY missing_setlists DESC
    """

    cursor = conn.execute(query)
    rows = cursor.fetchall()

    print("SCRAPING RECOMMENDATIONS")
    print("=" * 80)
    print()

    critical_years = [row for row in rows if row[2] > 100]
    high_priority = [row for row in rows if 50 < row[2] <= 100]
    medium_priority = [row for row in rows if 10 < row[2] <= 50]
    low_priority = [row for row in rows if row[2] <= 10]

    if critical_years:
        print("CRITICAL PRIORITY (>100 missing setlists):")
        print("-" * 80)
        for year, total, missing in critical_years:
            print(f"  Year {year}: {missing:,} of {total:,} shows missing ({missing/total*100:.1f}% incomplete)")
        print()

    if high_priority:
        print("HIGH PRIORITY (50-100 missing setlists):")
        print("-" * 80)
        for year, total, missing in high_priority:
            print(f"  Year {year}: {missing:,} of {total:,} shows missing ({missing/total*100:.1f}% incomplete)")
        print()

    if medium_priority:
        print("MEDIUM PRIORITY (10-50 missing setlists):")
        print("-" * 80)
        for year, total, missing in medium_priority:
            print(f"  Year {year}: {missing:,} of {total:,} shows missing ({missing/total*100:.1f}% incomplete)")
        print()

    if low_priority:
        print("LOW PRIORITY (1-10 missing setlists):")
        print("-" * 80)
        for year, total, missing in low_priority:
            print(f"  Year {year}: {missing:,} of {total:,} shows missing ({missing/total*100:.1f}% incomplete)")
        print()

    print()
    print("RECOMMENDED SCRAPING ORDER:")
    print("-" * 80)
    scrape_order = sorted(rows, key=lambda x: (-x[2], x[0]))  # Sort by missing desc, then year
    for idx, (year, total, missing) in enumerate(scrape_order[:10], 1):
        print(f"  {idx}. Year {year} - {missing:,} missing setlists")
    print()

def main():
    """Run all diagnostics"""
    try:
        conn = connect_db()

        overall_statistics(conn)
        year_by_year_coverage(conn)
        problematic_years(conn)
        setlist_statistics(conn)
        suspicious_shows(conn)
        recent_shows_status(conn)
        scraping_recommendations(conn)

        print("=" * 80)
        print("END OF DIAGNOSTIC REPORT")
        print("=" * 80)

        conn.close()

    except sqlite3.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
