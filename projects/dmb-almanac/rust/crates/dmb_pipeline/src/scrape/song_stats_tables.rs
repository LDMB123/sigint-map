#[path = "song_stats_tables_history.rs"]
mod song_stats_tables_history;
#[path = "song_stats_tables_performances.rs"]
mod song_stats_tables_performances;

pub(crate) use self::song_stats_tables_history::{parse_plays_by_year, parse_top_segues};
pub(crate) use self::song_stats_tables_performances::{
    parse_song_liberations, parse_song_performances,
};
