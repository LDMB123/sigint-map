//! Performance metrics and Web Vitals tracking.

mod performance;
mod web_vitals;

pub use performance::{mark, measure, duration};
#[allow(unused_imports)]  // Used in conditional compilation
pub use performance::{get_marks, PerfMonitor};
pub use web_vitals::init as init_web_vitals;
#[allow(unused_imports)]  // Used in conditional compilation
pub use web_vitals::{WebVitals, get_vitals};
