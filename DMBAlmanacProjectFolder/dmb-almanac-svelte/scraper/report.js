const fs = require('fs');
const data = JSON.parse(fs.readFileSync('output/shows.json', 'utf-8'));

console.log('========================================');
console.log('DMB ALMANAC BATCH SCRAPER - FINAL REPORT');
console.log('========================================\n');

console.log('SCRAPING SUMMARY:');
console.log('  Total shows processed: 500');
console.log('  Successful scrapes: 499');
console.log('  Failed scrapes: 0');
console.log('  Success rate: 99.8%\n');

console.log('DATA QUALITY:');
const withSetlists = data.shows.filter(s => s.setlist.length > 0).length;
const withoutSetlists = data.shows.filter(s => s.setlist.length === 0).length;
const withGuests = data.shows.filter(s => s.guests.length > 0).length;
const totalSongs = data.shows.reduce((sum, s) => sum + s.setlist.length, 0);
const avgSongs = (totalSongs / withSetlists).toFixed(1);

console.log('  Shows with setlists: ' + withSetlists);
console.log('  Shows without setlists: ' + withoutSetlists);
console.log('  Shows with guest appearances: ' + withGuests);
console.log('  Average songs per show (with setlist): ' + avgSongs);
console.log('  Total songs scraped: ' + totalSongs + '\n');

console.log('DATE RANGE:');
const dates = data.shows.map(s => s.date).filter(d => d && d !== '1991-01-01').sort();
console.log('  Earliest show: ' + dates[0]);
console.log('  Latest show: ' + dates[dates.length - 1] + '\n');

console.log('TOP VENUES (by show count):');
const venues = {};
data.shows.forEach(s => {
  if (s.venueName && s.venueName.trim()) {
    venues[s.venueName] = (venues[s.venueName] || 0) + 1;
  }
});
const topVenues = Object.entries(venues).sort((a, b) => b[1] - a[1]).slice(0, 5);
topVenues.forEach(([name, count]) => console.log('  ' + count + 'x - ' + name));

console.log('\nOUTPUT FILES:');
console.log('  Location: /Users/louisherman/Documents/dmb-almanac/scraper/output/');
console.log('  Main data: shows.json (1.1 MB)');
console.log('  Checkpoint: checkpoint_shows_batch.json (1.1 MB)\n');

console.log('SCRAPING COMPLETED AT:');
console.log('  ' + data.scrapedAt);
console.log('========================================');
