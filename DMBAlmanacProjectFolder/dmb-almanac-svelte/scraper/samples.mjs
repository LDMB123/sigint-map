import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('output/shows.json', 'utf-8'));
const showsWithSetlists = data.shows.filter(s => s.setlist.length > 10).slice(0, 5);

console.log('\n========================================');
console.log('SAMPLE SHOW DATA (5 Examples)');
console.log('========================================\n');

let sampleNum = 1;
for (const s of showsWithSetlists) {
  console.log('SAMPLE ' + sampleNum + ':');
  console.log('  Date: ' + s.date);
  console.log('  Venue: ' + s.venueName);
  console.log('  Location: ' + s.city + ', ' + s.state);
  console.log('  Total Songs: ' + s.setlist.length);
  console.log('  Setlist (first 10 songs):');
  for (let i = 0; i < Math.min(10, s.setlist.length); i++) {
    const song = s.setlist[i];
    const duration = song.duration ? ' [' + song.duration + ']' : '';
    const guests = song.guestNames.length > 0 ? ' (with ' + song.guestNames.slice(0, 2).join(', ') + ')' : '';
    console.log('    ' + song.position + '. ' + song.songTitle + duration + guests);
  }
  if (s.setlist.length > 10) {
    console.log('    ... and ' + (s.setlist.length - 10) + ' more songs');
  }
  if (s.guests.length > 0) {
    console.log('  Guests: ' + s.guests.slice(0, 3).map(g => g.name).join(', '));
  }
  console.log('');
  sampleNum++;
}
