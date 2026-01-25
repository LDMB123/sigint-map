# DMBAlmanac.com Complete Site Structure Documentation

## Executive Summary

This document provides an exhaustive analysis of dmbalmanac.com's complete site structure, URL patterns, and data models. The site has been maintained since 2002 and transitioned to a fully automated database-driven web application that same year. As of January 2026, the database contains:

- **83 Tours** documented
- **3,578 Shows** recorded
- **448 Shows** with unknown/incomplete data
- **200+ Songs** tracked
- **500+ Venues** cataloged
- **1,400+ Guest Musicians** documented
- **Date Range**: 1991 to present (2026)

---

## 1. Navigation & Site Architecture

### Main Navigation Menu

| Section | URL | Purpose |
|---------|-----|---------|
| Home | `/Default.aspx` | Homepage with stats, news, upcoming shows |
| Tours / Stats | `/TourShow.aspx` | Tour listings, year navigation, statistics |
| Songs | `/songs/all-songs.aspx` | Song catalog by category |
| Lyrics | `/songs/lyrics.aspx` | Lyrics database |
| Guests | `/Guests.aspx` | Guest musician listings |
| Venues | `/Venues.aspx` | Venue listings with filtering |
| Search | `/FindSetlist.aspx` | Multi-parameter search |
| Discography | `/Releases.aspx` | Complete release catalog |
| Lists | `/Lists.aspx` | Curated statistical lists |
| Contact | `/Contact.aspx` | Contact form |
| Submit | `/Submit.aspx` | User contribution form |
| Support Us | `/Order.aspx` | Donation page |
| About | `/About.aspx` | Site information |

### Secondary Navigation

- Year-based navigation: 1991-2026 (via `TourShow.aspx?where=[YEAR]`)
- Live Setlist: `/setlist` (real-time show tracking)

---

## 2. Show/Concert Pages

### 2.1 Tour Show Listing

**URL Pattern**: `TourShow.aspx`
**URL with Year Filter**: `TourShow.aspx?where=[YEAR]`

**Data Fields (Tour Summary)**:
| Field | Description |
|-------|-------------|
| Tour Name | Name/identifier for tour (hyperlinked) |
| Shows | Total show count |
| Unknown Shows | Count of incomplete data |
| Cancelled Shows | Cancelled performance count |
| Rescheduled Shows | Rescheduled performance count |
| Completion % | Data completion percentage (0-100%) |
| Song Checklist | Link to tour song checklist |

**Aggregate Statistics Displayed**:
- 83 total tours
- 3,578 total shows
- 448 unknown shows
- 63 cancelled shows
- 120 rescheduled shows

### 2.2 Tour Shows by Year

**URL Pattern**: `TourShowsByYear.aspx?year=[YYYY]`
**Alternative**: `TourShow.aspx?where=[YEAR]`

**Data Fields Per Show**:
| Field | Format | Description |
|-------|--------|-------------|
| Date | MM.DD.YY | Show date |
| Venue | Text (linked) | Venue name with link to VenueStats |
| Location | City, State/Country | Geographic location |
| Info/Description | Text | Event context (festivals, etc.) |
| Opening Act | Text | Supporting artist(s) |
| Rarity Ranking | Number (percentile) | Setlist rarity score |
| Show Duration | HH:MM:SS | Total performance time |

**Visual Indicators/Icons**:
| Icon | Meaning |
|------|---------|
| Camera icon | Setlist scan available |
| Stub icon | Ticket stub image available |
| Poster icon | Show poster available |
| Mask/Cast icon | Guest appearance info |
| CD/Badge icon | Officially released recording |

**Tour Groupings**:
- By Tour (e.g., "Summer 2025", "Fall 2023")
- By Artist (DMB, Dave solo, Dave & Tim, Stefan projects, Openers)

### 2.3 Individual Show Setlist

**URL Pattern**: `TourShowSet.aspx?id=[SHOW_ID]`

**Header Fields**:
| Field | Description |
|-------|-------------|
| Date | Full date (MM.DD.YY format) |
| Venue | Venue name (hyperlinked to VenueStats) |
| Location | City, State/Country |
| Tour | Tour name/identifier |
| Rarity Index | Statistical rarity calculation |

**Setlist Structure**:
```
Set 1
  1. Song Name [duration] ->
  2. Song Name [duration]
  ...
Set 2
  1. Song Name [duration]
  ...
Encore
  1. Song Name [duration]
  ...
Encore 2 (if applicable)
  1. Song Name [duration]
```

**Setlist Data Fields Per Song**:
| Field | Format | Description |
|-------|--------|-------------|
| Position | Integer | Song order within set |
| Set Marker | "Set 1"/"Set 2"/"Encore"/"Encore 2" | Set designation |
| Song Title | Text (hyperlinked) | Links to SongStats |
| Duration | M:SS or MM:SS | Song length |
| Segue Indicator | -> or > | Transition to next song |
| Guest Appearances | Text (hyperlinked) | Links to GuestStats |
| Role | Tease/Aborted/Fake/Partial/Reprise | Special performance type |

**Additional Sections**:
| Section | Content |
|---------|---------|
| Soundcheck | Songs performed during soundcheck |
| Show Notes | Performance context, notable events |
| Setlist Scan | Image of physical setlist (if available) |
| Poster | Show poster image (if available) |
| Ticket Stub | Ticket image (if available) |

**Color Coding**:
| Color | Meaning |
|-------|---------|
| Teal | Set Opener |
| Blue | Set Closer |
| Red | Encore |

### 2.4 Tour Information/Statistics

**URL Pattern**: `TourShowInfo.aspx?tid=[TOUR_ID]&where=[YEAR]`

**Data Fields**:
| Field | Description |
|-------|-------------|
| Total Shows | Show count for tour |
| Total Song Performances | Cumulative song plays |
| Average Songs Per Show | Mean setlist length |
| Different Songs Played | Unique song count |

**Statistics Sections**:
| Section | Content |
|---------|---------|
| Most Played Songs | Songs with highest frequency + counts |
| Least Played Songs | Songs played once or rarely |
| Top Openers | Most common opening songs |
| Top Closers | Most common closing songs |
| Top Encores | Most common encore songs |
| Longest Performances | Extended versions with duration |
| Liberations | Songs returning after long absences |
| Song Teases | Partial song plays |

### 2.5 Tour Statistics

**URL Pattern**: `TourStats.aspx?tid=[TOUR_ID]`

**Same structure as TourShowInfo but focused on aggregate metrics**

### 2.6 Song Checklist by Tour

**URL Pattern**: `SongChecklist.aspx?tid=[TOUR_ID]`

**Structure**:
- Grid with show dates as columns
- Songs as rows (alphabetical)
- Cells show cumulative play count

**Cell Indicators**:
| Indicator | Meaning |
|-----------|---------|
| Number | Cumulative play count |
| Empty | Not played |
| Color-coded | Slot position (opener/closer/encore) |
| P | Partial |
| F | Fake |
| R | Reprise |

---

## 3. Song Pages

### 3.1 Song List / Catalog

**URL Pattern**: `/songs/all-songs.aspx`

**Organization Categories**:
- Studio Albums (by album)
- Tim Reynolds Solo Work
- Studio Collaborations
- Live Collaborations
- Cover Songs
- Unreleased Material
- Segues/Interludes
- Pre-DMB Era Songs
- Defunct/Retired Songs

**Data Per Song**:
| Field | Description |
|-------|-------------|
| Title | Song name (hyperlinked) |
| Album/Release | Associated release |
| Track Position | Position on album |
| Classification | Original/Cover/Collaboration |

**URL Pattern for Individual Songs**: `/songs/summary.aspx?sid=[SONG_ID]`

### 3.2 Song Summary/Statistics

**URL Pattern**: `/songs/summary.aspx?sid=[SONG_ID]`
**Alternative**: `SongStats.aspx?sid=[SONG_ID]`

**Composition Details**:
| Field | Description |
|-------|-------------|
| Title | Song name |
| Composers | Writer credits |
| Album | Original album |
| Year | Composition year |
| Song ID | Database identifier |

**Performance Statistics**:
| Field | Description |
|-------|-------------|
| Live Debut | First performance date |
| Total Performances | All-time play count |
| Years Active | Span of performances |
| Total Duration | Cumulative play time (HH:MM:SS) |

**Statistics by Artist**:
| Artist Type | Fields |
|-------------|--------|
| Dave Matthews Band | First Show, Last Show, Avg Length, Play Count, % of Total |
| Dave Matthews Solo | First Show, Last Show, Avg Length, Play Count, % of Total |
| Dave Matthews & Tim Reynolds | First Show, Last Show, Avg Length, Play Count, % of Total |

**Set Position Data**:
| Position | Count | Percentage |
|----------|-------|------------|
| Opener | Count | % |
| Midset | Count | % |
| Set 1 Closer | Count | % |
| Set 2 Opener | Count | % |
| Closer | Count | % |
| Encore | Count | % |
| 2nd Encore | Count | % |
| Partial | Count | % |

**Version Length Data**:
| Section | Fields |
|---------|--------|
| Longest Performances | Duration, Date, Venue |
| Shortest Performances | Duration, Date, Venue |

**Segue Information**:
| Direction | Data |
|-----------|------|
| Into | Songs that follow, count |
| Out Of | Songs that precede, count |

**Release Information**:
| Category | Count |
|----------|-------|
| Studio Albums | # |
| Box Sets | # |
| Compilations | # |
| Singles | # |
| Live Albums | # |
| DMBlive Series | # |
| Live Trax Series | # |
| Various/Tributes | # |

### 3.3 Song Sub-Pages

**History**: `/songs/history.aspx?sid=[SONG_ID]`
- Complete performance history table
- Columns: Date, Venue, Duration, Position, Notes

**Releases**: `/songs/releases.aspx?sid=[SONG_ID]`
- All releases containing this song
- Categories: Studio, Live, Compilations

**Broadcasts**: `/songs/broadcasts.aspx?sid=[SONG_ID]`
- Performances that were broadcast/streamed
- Columns: Date, Time, Personnel, Notes

**By Year**: `/songs/byyear.aspx?sid=[SONG_ID]`
- Annual play count breakdown
- Yearly statistics and trends

**Segues**: `/songs/segues.aspx?sid=[SONG_ID]`
- Into: Songs that typically follow
- Out Of: Songs that typically precede
- Count of each segue combination

**Guests**: `/songs/guests.aspx?sid=[SONG_ID]`
- Guest musicians who have performed this song
- Columns: Guest Name, Instrument, Count

**All Performances**: `/songs/allperformances.aspx?sid=[SONG_ID]`
- Comprehensive performance list
- Full details per performance

### 3.4 Tour-Specific Song Performances

**URL Pattern**: `TourSongShows.aspx?sid=[SONG_ID]&tid=[TOUR_ID]&where=[YEAR]`

**Data Fields**:
| Field | Description |
|-------|-------------|
| Show Date | Performance date (linked) |
| Position | Setlist position |
| Duration | Song length (M:SS) |
| Personnel | Band members + guests (linked) |
| Notes | Performance notes |

### 3.5 Lyrics Page

**URL Pattern**: `/songs/lyrics.aspx`

**Features**:
- Dropdown song selector (autocomplete)
- Full lyrics display
- Copyright notice for protected content

### 3.6 Liberation List

**URL Pattern**: `/songs/liberation.aspx`

**Columns**:
| Column | Description |
|--------|-------------|
| Rank | Position on liberation list |
| Song Name | Song title (linked) |
| Missing Since | Last performance date (linked) |
| Days Since | Calendar days elapsed |
| Shows Since | Number of intervening shows |
| Notes | Context (teased, Dave solo, guest required, etc.) |

**Liberation Definition**: Songs not performed for extended periods
**Liberated Indicator**: `=LIBERATED on [date]=` when song returns

---

## 4. Venue Pages

### 4.1 Venue List

**URL Pattern**: `/Venues.aspx`

**Filtering Options**:
| Filter | Description |
|--------|-------------|
| City | Dropdown with 510+ cities |
| State/Province | US states, Canadian provinces, etc. |
| Country | 30+ countries |
| Market | Media market designations |

**Data Per Venue in List**:
| Field | Description |
|-------|-------------|
| Location | City, State/Country code |
| Venue Name | Full name with aliases in brackets |
| Venue Type | Classification |

**Venue Types**:
- Indoor Arena
- Outdoor Amphitheater
- Stadium
- Auditorium
- Bar/Club
- Festival
- Studio
- Unknown

**Pagination**: 50 venues per page

### 4.2 Venue Statistics

**URL Pattern**: `VenueStats.aspx?vid=[VENUE_ID]`

**Venue Information**:
| Field | Description |
|-------|-------------|
| Venue Name | Full name |
| Alternative Names | Historical names in brackets |
| Location | City, State, Country |
| Venue Type | Classification |

**Performance Statistics**:
| Field | Description |
|-------|-------------|
| Total Shows | All-time show count |
| First Show | First performance date |
| Last Show | Most recent performance |

**Show History**:
- Chronological list of all shows
- Links to individual setlists

**Common Songs**:
- Most frequently played songs at venue
- Play counts

### 4.3 Tour-Specific Venue Shows

**URL Pattern**: `TourVenueShows.aspx?vid=[VENUE_ID]&where=[YEAR]`

**Data Fields**:
| Field | Description |
|-------|-------------|
| Number of Shows | Shows at venue during tour |
| Total Song Performances | Cumulative songs played |
| Average Songs Per Show | Mean setlist length |
| Different Songs Played | Unique songs at venue |
| Most/Least Played | Frequency rankings |
| Openers/Closers/Encores | Slot analysis |
| Longest Performances | Extended versions |
| Liberations | Rare songs played |

---

## 5. Guest/Band Member Pages

### 5.1 Guest List

**URL Pattern**: `/Guests.aspx`

**Organization**:
- Alphabetical listing
- Special section: "Band Member Performances"

**Data Per Guest**:
| Field | Description |
|-------|-------------|
| Guest Name | Full name (hyperlinked) |
| Instrument(s) | Performance role(s) |

**Scale**: 1,400+ guest musicians documented

**Instrument Categories**:
- Stringed (violin, cello, guitar, bass)
- Horns/Woodwinds (saxophone, trumpet, trombone, flute)
- Keyboards/Percussion
- Specialty/World (djembe, kora, didgeridoo, sitar)

**Core Band Members**:
| Name | Instrument |
|------|------------|
| Carter Beauford | Drums |
| Dave Matthews | Guitar, Vocals |
| Stefan Lessard | Bass |
| Tim Reynolds | Guitar |
| LeRoi Moore | Horn, Wind |
| Peter Griesar | Keyboards, Harmonica |
| Boyd Tinsley | Violin |

### 5.2 Guest Statistics

**URL Pattern**: `GuestStats.aspx?gid=[GUEST_ID]`

**Guest Information**:
| Field | Description |
|-------|-------------|
| Name | Full name |
| Instruments | Performance roles |

**Performance Statistics**:
| Field | Description |
|-------|-------------|
| Show Appearances | Total shows |
| Distinct Songs | Unique songs performed |
| Total Song Appearances | Cumulative song performances |

**Chronological History**:
- Year-by-year breakdown
- Show dates with links

**Songs Performed**:
- List of all songs with guest
- Frequency per song

### 5.3 Tour-Specific Guest Appearances

**URL Pattern**: `TourGuestShows.aspx?gid=[GUEST_ID]&tid=[TOUR_ID]`

**Data Fields**:
| Field | Description |
|-------|-------------|
| Guest Name | Name with instruments |
| Tour Association | Tour name/period |
| Full Performances | Show count on tour |
| Performance Details | Individual appearances |

---

## 6. Discography Pages

### 6.1 Release List

**URL Pattern**: `/Releases.aspx`

**Release Categories**:
| Category | Description |
|----------|-------------|
| Studio Albums | Core releases |
| EPs | Extended plays |
| Side Projects | Artist collaborations |
| Box Sets | Special edition collections |
| Compilations | Best-of collections |
| Singles | Individual song releases |
| Live Albums | Full concert recordings |
| Live Trax Series | Vol. 1-72+ numbered series |
| DMBlive Series | Vol. 1-30 early venue recordings |
| Warehouse Releases | Member-exclusive discs |
| Blenheim Vineyards Discs | Acoustic duets |
| Documentaries | Video releases |
| Guest Appearances | Collaborations |
| Covers & Tributes | Other artist interpretations |
| V/A Compilations | Soundtracks, promos |

**Data Per Release**:
| Field | Description |
|-------|-------------|
| Title | Release name (hyperlinked) |
| Release ID | Database identifier |

### 6.2 Release View

**URL Pattern**: `ReleaseView.aspx?release=[RELEASE_ID]`

**Release Information**:
| Field | Description |
|-------|-------------|
| Title | Full release name |
| Release Date | Publication date |
| Format | CD, Vinyl, Digital, DVD |
| Classification | Category designation |
| Distribution | How released |
| Cover Art | Album artwork |
| Notes | Additional context |

**Tracklist Fields**:
| Field | Description |
|-------|-------------|
| Track Number | Position on release |
| Song Title | Name (hyperlinked to song stats) |
| Duration | Track time |
| Source Show | Performance date in [brackets] |
| Personnel | Musicians credited |
| Notes | Performance context |

**Visual Indicators**:
| Indicator | Meaning |
|-----------|---------|
| Yellow highlight | Performance date in notes |
| Teal highlight | Track was opener |
| Blue highlight | Track was closer |
| Red highlight | Track was encore |
| No track number | Multiple songs in one track |

**Navigation**:
- Previous/Next release buttons
- CD/disc numbering for multi-disc sets

### 6.3 Live Trax Series Grid

**URL Pattern**: `ListView.aspx?id=25`

**Columns (12 total)**:
| Column | Description |
|--------|-------------|
| Link | Reference identifier |
| Release | Album title (Vol. 1-72) |
| Show Date(s) | Performance date(s) |
| Venue & Location | Concert venue |
| Announce Date | Announcement date |
| Release Date | Official release |
| Rel. to Rel. | Days between releases |
| Ann. to Rel. | Days from announcement to release |
| Rel. to Ann. | Days from prior release to announcement |
| Length | Total runtime |
| CDs | Disc count |
| Format | Digital, Vinyl, Video, HD-FLAC |

### 6.4 Live Trax Credits Grid

**URL Pattern**: `ListView.aspx?id=43`

**Columns**:
| Column | Description |
|--------|-------------|
| Mix | Mixing engineer |
| Live Sound & Monitor | Sound engineer |
| Recording Engineer | Recording technician |
| Digital Editing | Post-production editor |
| Mastering | Mastering engineer |
| Photos | Photographer credits |

### 6.5 DMBlive Series Grid

**URL Pattern**: `ListView.aspx?id=34`

**Columns (10 total)**:
| Column | Description |
|--------|-------------|
| Link | Reference identifier |
| Release | Album title (Vol. 1-30) |
| Show Date | Performance date |
| Show Type | Artist configuration |
| Venue & Location | Concert venue |
| Release Date | Publication date |
| Rel. to Rel. | Days between releases |
| Length | Total runtime |
| Digital | Audio format/bitrate |
| Vinyl | Physical edition details |

---

## 7. Statistics & Analysis Pages

### 7.1 Homepage Statistics Widget

**URL**: `/Default.aspx`

**Current Tour Statistics**:
| Field | Description |
|-------|-------------|
| Total Shows | Shows in current tour |
| Song Performances | Cumulative plays |
| Average Songs Per Show | Mean setlist length |
| Different Songs Played | Unique song count |

**Lists Displayed**:
- Most Played Songs (with counts)
- Least Played Songs (with counts)
- Top Openers (with counts)
- Top Closers (with counts)
- Top Encores (with counts)
- Longest Performances (with durations)
- Recent Liberations (with days/shows since)

**Show Widgets**:
- Last 5 Shows (date, venue, location)
- Next 5 Shows (date, venue, location)

**This Day in DMB History**:
- Shows from today's date across years

### 7.2 Curated Lists Page

**URL Pattern**: `/Lists.aspx`

**List Categories**:

**Song Lists**:
| List | URL |
|------|-----|
| Rarest Song Per Album | `ListView.aspx?id=36` |
| Top 20 Longest Say Goodbye Intros | `ListView.aspx?id=24` |
| Songs Played in Acoustic Set 2014-2015 | `ListView.aspx?id=16` |
| Songs Played by Dave & Tim | `ListView.aspx?id=37` |
| #41 -> Say Goodbye | `ListView.aspx?id=33` |
| Tributes After Celebrities' Deaths | `ListView.aspx?id=38` |
| The Long Black Veil | `ListView.aspx?id=51` |
| Songs as Opener, Closer, and Encore | `ListView.aspx?id=41` |
| Dave Plays Non-Standard Instrument | `ListView.aspx?id=42` |
| Longest Documented Performances By Song | `ListView.aspx?id=44` |
| Tim Reynolds Solos at D&T Shows | `ListView.aspx?id=68` |
| Lie in Our Graves Reprises Played Separately | `ListView.aspx?id=71` |
| The 100 Longest Known Performances | `ListView.aspx?id=77` |

**Venue Lists**:
| List | URL |
|------|-----|
| Venues With Most Shows Before Full Release | `ListView.aspx?id=23` |
| Countries DMB Has Played In | `ListView.aspx?id=30` |
| States DMB Has Played In | `ListView.aspx?id=57` |

**Show Lists**:
| List | URL |
|------|-----|
| Full Shows on SiriusXM | `ListView.aspx?id=31` |
| Shows with 6+ Songs at 10:00+ | `ListView.aspx?id=80` |
| Longest Shows by Song Time | `ListView.aspx?id=40` |
| Shows Without Complete Audio (by era) | Various IDs |
| Shows With Officially-Released Songs (by decade) | Various IDs |
| Live Video Webcast Streams | `ListView.aspx?id=72` |
| Mom It's My Birthday | `ListView.aspx?id=76` |

**Timeline Lists**:
| List | URL |
|------|-----|
| 1998 Fall Tour | `ListView.aspx?id=48` |
| Original Song Debuts | `ListView.aspx?id=50` |
| 41 Live Performances of #41 | `ListView.aspx?id=27` |
| DMB + Phish | `ListView.aspx?id=28` |
| DMB + Flecktones | `ListView.aspx?id=81` |

**Release Lists**:
| List | URL |
|------|-----|
| Live Trax Release Info Grid | `ListView.aspx?id=25` |
| Live Trax Credits Grid | `ListView.aspx?id=43` |
| DMBlive Release Info Grid | `ListView.aspx?id=34` |

### 7.3 Specific List Structures

**Longest Shows** (`ListView.aspx?id=40`):
| Column | Description |
|--------|-------------|
| Rank | Sequential position |
| Total Song Time | Duration (HH:MM:SS) |
| Show Date | Performance date |
| Venue & Location | Concert venue |
| Songs | Track count |
| 10+ Min. Songs | Extended song count |
| Longest Song | Title with duration |
| Release | Official release indicator |

**100 Longest Performances** (`ListView.aspx?id=77`):
| Column | Description |
|--------|-------------|
| Rank | Position (1-100) |
| Length | Duration (MM:SS) |
| Song | Song title |
| Date | Performance date |
| Location | Venue and city |
| Personnel | Musicians |
| Release | Official release indicator |

**Countries Played** (`ListView.aspx?id=30`):
| Column | Description |
|--------|-------------|
| Country | Nation name |
| # of DMB Shows | Full band show count |
| First DMB Show | Earliest date |
| Last DMB Show | Most recent date |
| # of Other Shows | D&T, solo, guest shows |
| Notes | Context |

**States Played** (`ListView.aspx?id=57`):
| Column | Description |
|--------|-------------|
| Order | Ranking |
| State | State name |
| First Show | Earliest date |
| Venue & Location | First venue |
| First Song | Opening song |
| Last Show | Most recent date |
| Venue & Location | Last venue |
| Notes | Context |

**Original Song Debuts** (`ListView.aspx?id=50`):
| Column | Description |
|--------|-------------|
| Song Title | Name (linked) |
| Overall Debut | First live performance |
| Debut Personnel | Musicians present |
| Studio Release | Release date |
| DMB Debut | Full band debut |
| D&T Debut | Dave & Tim debut |
| Dave Solo Debut | Solo debut |
| Notes | Evolution context |

**Live Video Webcasts** (`ListView.aspx?id=72`):
| Column | Description |
|--------|-------------|
| Show Date | Performance date |
| Venue & Location | Concert venue |
| Show Type | Artist configuration |
| Show Name | Event/festival name |
| Streaming Platform | YouTube, farmaid.org, etc. |

---

## 8. Search Features

### 8.1 Setlist Search

**URL Pattern**: `/FindSetlist.aspx`

**Search Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| tour | Dropdown | Year/tour filter (1991-2026) |
| song | Multi-select | Comma-separated song IDs |
| order | Checkbox (0/1) | Match exact song order |
| excludeRoles | Checkbox (0/1) | Exclude teases, aborts, fakes, reprises, partials |

**Features**:
- Autocomplete song input (2+ characters)
- Up to 10 matches in dropdown
- Multiple song selection as tags
- Keyboard navigation (arrow keys, enter)
- AJAX-updated song list when tour changes

**Result Format**:
- Tabular setlist display
- Tour, date, venue information
- Hidden fields for persistent filtering
- Mobile-responsive tabs

### 8.2 Song Search Results

**URL Pattern**: `SongSearchResult.aspx`

**Result Fields**:
- Song title
- Performance counts
- Slot information
- Tour context

---

## 9. Live Setlist Feature

**URL Pattern**: `/setlist`

**Purpose**: Real-time show tracking during performances

**Features**:
- Auto-refresh every 60 seconds
- Countdown timer display
- No manual refresh needed
- Progressive song addition

**Album Color Legend**:
- Different colors per album
- Covers and unreleased material distinguished

**Data Displayed**:
| Field | Description |
|-------|-------------|
| Show Date | Current performance date |
| Artist | DMB, Dave & Tim, etc. |
| Venue | Current venue |
| Location | City, State |
| Current Setlist | Songs played so far |

---

## 10. User Contribution System

### 10.1 Submit Page

**URL Pattern**: `/Submit.aspx`

**Submission Categories (14 types)**:
1. Setlist Scans - Physical setlist images
2. Alternate Lyrics - Lyrical variations
3. Corrections - Data errors
4. Posters - Show poster images
5. Ticket Stubs - Ticket images (warehouse preferred)
6. Missing Setlists - Unknown show data
7. Soundchecks - Pre-show rehearsal info
8. Song Information - Performance details (interpolations, timing)
9. House Music - Pre/post-show venue music
10. Show Information - Notable circumstances
11. Guest Information - Guest musician background
12. Song Times - Precise duration measurements

**Form Fields**:
| Field | Required | Description |
|-------|----------|-------------|
| Submission Type | Yes | Dropdown selection |
| Name | Yes | Contributor name |
| CAPTCHA | Yes | Type "41" |
| Email | Yes | Contact email |
| Submission Text | Yes | Details/context |
| File Attachment | No | Supporting files |

### 10.2 Contact Page

**URL Pattern**: `/Contact.aspx`

**Form Fields**:
- Name (required)
- Security verification ("41")
- Email address
- Message content
- File attachment (optional)

---

## 11. URL Parameter Reference

### Entity ID Parameters

| Parameter | Entity | Example |
|-----------|--------|---------|
| `id` | Show | `TourShowSet.aspx?id=1234` |
| `sid` | Song | `SongStats.aspx?sid=21` |
| `vid` | Venue | `VenueStats.aspx?vid=100` |
| `gid` | Guest | `GuestStats.aspx?gid=15` |
| `tid` | Tour | `TourStats.aspx?tid=8185` |
| `year` | Year | `TourShowsByYear.aspx?year=2024` |
| `where` | Year (alt) | `TourShow.aspx?where=2023` |
| `release` | Release | `ReleaseView.aspx?release=300` |

### List Parameters

| Parameter | Entity | Example |
|-----------|--------|---------|
| `id` | List ID | `ListView.aspx?id=25` |

### Combined Parameters

| URL Pattern | Parameters |
|-------------|------------|
| Tour Song Shows | `TourSongShows.aspx?sid=[SID]&tid=[TID]&where=[YEAR]` |
| Tour Guest Shows | `TourGuestShows.aspx?gid=[GID]&tid=[TID]` |
| Tour Venue Shows | `TourVenueShows.aspx?vid=[VID]&where=[YEAR]` |
| Song Checklist | `SongChecklist.aspx?tid=[TID]` |

---

## 12. Data Model Relationships

### Entity Relationship Diagram

```
Tour (1) ────────< (many) Show
                          │
                          ├───< (many) SetlistEntry ───> (1) Song
                          │              │
                          │              └───< (many) GuestAppearance
                          │                              │
                          ├───> (1) Venue                └───> (1) Guest
                          │
                          └───< (many) ShowGuestAppearance ──> (1) Guest

Song (1) ────────< (many) ReleaseTrack ───> (1) Release
     │
     └───< (many) Segue ───> (1) Song (target)

Release (1) ────< (many) ReleaseTrack ───> (1) Song
        │
        └───< (many) SourceShow ───> (1) Show
```

### Core Entities

**Tour**:
- tour_id (PK)
- tour_name
- year
- total_shows
- unknown_shows
- cancelled_shows
- rescheduled_shows
- completion_percentage

**Show**:
- show_id (PK)
- tour_id (FK)
- venue_id (FK)
- show_date
- show_duration
- rarity_index
- rarity_percentile
- has_setlist_scan
- has_poster
- has_ticket_stub

**SetlistEntry**:
- entry_id (PK)
- show_id (FK)
- song_id (FK)
- position
- set_marker (Set 1/Set 2/Encore/Encore 2)
- duration
- has_segue
- role (Full/Tease/Aborted/Fake/Partial/Reprise)

**Song**:
- song_id (PK)
- title
- composers
- album_origin
- composition_year
- live_debut_date
- total_performances
- is_cover
- is_retired

**Venue**:
- venue_id (PK)
- venue_name
- alternative_names
- city
- state_province
- country
- venue_type
- first_show_date
- last_show_date
- total_shows

**Guest**:
- guest_id (PK)
- name
- instruments
- first_appearance_date
- total_show_appearances
- total_song_appearances

**Release**:
- release_id (PK)
- title
- release_date
- format
- category
- disc_count
- total_runtime

**GuestAppearance**:
- appearance_id (PK)
- entry_id (FK) [SetlistEntry]
- guest_id (FK)

**Segue**:
- segue_id (PK)
- from_song_id (FK)
- to_song_id (FK)
- occurrence_count

**ReleaseTrack**:
- track_id (PK)
- release_id (FK)
- song_id (FK)
- source_show_id (FK)
- track_number
- disc_number
- duration
- is_opener
- is_closer
- is_encore

---

## 13. Calculated Metrics

### Rarity Index
- Calculated per show
- Based on frequency of songs played vs. tour averages
- Higher number = more rare/unusual setlist
- Displayed as number with percentile

### Liberation Metrics
- **Days Since**: Calendar days since last performance
- **Shows Since**: Number of shows between performances
- **Liberated**: Song returned after extended absence (50+ shows typical threshold)

### Performance Statistics
- **Average Length**: Mean duration across all performances
- **% of Total**: Percentage of total plays for an artist configuration
- **Position Statistics**: Percentage in each slot (opener/midset/closer/encore)

### Tour Statistics
- **Average Songs Per Show**: Total performances / total shows
- **Different Songs Played**: Count of unique songs on tour

---

## 14. Special Features

### This Day in DMB History
- Shows from current date across all years
- Format: Date, Venue, Location

### Album Color Legend (Live Setlist)
- Visual coding by source album
- Covers and unreleased distinguished

### Released Recording Indicators
- CD icon on show pages
- Links to official releases containing that performance

### Multi-Night Stands
- Consecutive shows at same venue tracked
- Common at Red Rocks, MSG, Alpine Valley, etc.

### Guest Requirements
- Some songs noted as requiring specific guests
- Liberation notes indicate guest dependencies

---

## 15. Data Coverage Notes

### Completeness
- Early shows (1991-1993): Many incomplete setlists
- Missing shows noted in unknown counts
- Soundchecks: Sporadically documented
- Song times: Not available for all performances

### Data Quality Indicators
- "Unknown" status for incomplete data
- Notes field for contextual caveats
- First documented vs. actual first (may differ)

### Update Frequency
- Active during touring season
- Live setlist updates in real-time
- Historical data corrections ongoing

---

## 16. Technical Implementation Notes

### Page Technology
- ASP.NET Web Forms (.aspx pages)
- AJAX for dynamic updates
- JavaScript for live setlist auto-refresh

### Date Formats
- Display: MM.DD.YY (show listings)
- Database: Standard date format
- URL Parameters: YYYY for year filters

### ID Structure
- Shows: Unix timestamp-based IDs observed
- Songs: Sequential numeric IDs
- Venues: Sequential numeric IDs
- Guests: Sequential numeric IDs
- Tours: Sequential numeric IDs
- Releases: Sequential numeric IDs
- Lists: Sequential numeric IDs

---

## 17. Appendix: Complete URL Reference

### Main Pages
```
/Default.aspx                    - Homepage
/TourShow.aspx                   - Tour listing
/TourShow.aspx?where=[YEAR]      - Year filter
/TourShowsByYear.aspx?year=[YYYY] - Alternative year
/TourShowSet.aspx?id=[ID]        - Individual show
/TourShowInfo.aspx?tid=[TID]&where=[YEAR] - Tour info
/TourStats.aspx?tid=[TID]        - Tour statistics
/SongChecklist.aspx?tid=[TID]    - Tour song grid
```

### Song Pages
```
/songs/all-songs.aspx            - Song catalog
/songs/summary.aspx?sid=[SID]    - Song summary
/songs/history.aspx?sid=[SID]    - Song history
/songs/releases.aspx?sid=[SID]   - Song releases
/songs/broadcasts.aspx?sid=[SID] - Song broadcasts
/songs/byyear.aspx?sid=[SID]     - Song by year
/songs/segues.aspx?sid=[SID]     - Song segues
/songs/guests.aspx?sid=[SID]     - Song guests
/songs/allperformances.aspx?sid=[SID] - All performances
/songs/lyrics.aspx               - Lyrics database
/songs/liberation.aspx           - Liberation list
/SongStats.aspx?sid=[SID]        - Song stats (alt)
/SongList.aspx                   - Song list (alt)
/SongSearchResult.aspx           - Search results
/TourSongShows.aspx?sid=[SID]&tid=[TID]&where=[YEAR] - Tour songs
```

### Venue Pages
```
/Venues.aspx                     - Venue list
/VenueList.aspx                  - Venue list (alt)
/VenueStats.aspx?vid=[VID]       - Venue statistics
/TourVenueShows.aspx?vid=[VID]&where=[YEAR] - Tour venues
```

### Guest Pages
```
/Guests.aspx                     - Guest list
/GuestList.aspx                  - Guest list (alt)
/GuestStats.aspx?gid=[GID]       - Guest statistics
/TourGuestShows.aspx?gid=[GID]&tid=[TID] - Tour guests
```

### Release Pages
```
/Releases.aspx                   - Release catalog
/ReleaseView.aspx?release=[RID]  - Release details
```

### List Pages
```
/Lists.aspx                      - All lists
/ListView.aspx?id=[LID]          - Individual list
```

### Utility Pages
```
/FindSetlist.aspx                - Search
/setlist                         - Live setlist
/Submit.aspx                     - Submit data
/Contact.aspx                    - Contact form
/Order.aspx                      - Support/donate
/About.aspx                      - About site
```

---

## 18. Data Extraction Checklist

### Core Data to Extract

**Shows** (3,578+ records):
- [ ] Show ID, date, venue, tour
- [ ] Rarity index and percentile
- [ ] Duration
- [ ] Media availability (scan, poster, ticket)
- [ ] Complete setlist with all fields

**Songs** (200+ records):
- [ ] Song ID, title, composers
- [ ] Album origin, composition year
- [ ] Live debut date
- [ ] All performance statistics
- [ ] Set position breakdowns
- [ ] Segue relationships
- [ ] Release associations

**Venues** (500+ records):
- [ ] Venue ID, name, aliases
- [ ] City, state, country
- [ ] Venue type
- [ ] Show count and dates

**Guests** (1,400+ records):
- [ ] Guest ID, name, instruments
- [ ] Appearance counts
- [ ] Songs performed

**Releases** (72+ Live Trax, 30+ DMBlive, many others):
- [ ] Release ID, title, date
- [ ] Format, category
- [ ] Complete tracklist with source shows
- [ ] Personnel credits

**Tours** (83+ records):
- [ ] Tour ID, name, year
- [ ] Show counts and statistics

**Setlist Entries** (estimated 50,000+):
- [ ] Entry ID, show ID, song ID
- [ ] Position, set, duration
- [ ] Segue indicator, role
- [ ] Guest appearances

**Segues**:
- [ ] From song, to song
- [ ] Occurrence count

**Lists** (50+ curated lists):
- [ ] List ID, title
- [ ] Column structure
- [ ] Row data

---

*Document generated: January 15, 2026*
*Source: dmbalmanac.com comprehensive analysis*
