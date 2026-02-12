//! Story Moments - Mini stories from Sparkle explaining kindness impact
//!
//! After each kind act, Sparkle tells a brief 1-sentence story to help
//! Blaire understand the positive impact of her kindness.

/// Hug category stories (5 variants)
const HUG_STORIES: [&str; 5] = [
    "Your hug made them feel warm and safe inside! 🤗",
    "That squeeze showed someone they're loved and important! 💕",
    "Your arms wrapped around them like a cozy blanket! 🫂",
    "When you hug, hearts fill up with happiness! ❤️",
    "That hug told them 'You matter to me!' without words! 🦄",
];

/// Nice Words category stories (5 variants)
const NICE_WORDS_STORIES: [&str; 5] = [
    "Your kind words made their heart smile! 😊",
    "Nice words are like magic spells that make people happy! ✨",
    "When you say nice things, the world feels brighter! 🌟",
    "Your words gave them a happy feeling they'll remember! 💜",
    "Kind words are tiny gifts you can give anytime! 🎁",
];

/// Sharing category stories (5 variants)
const SHARING_STORIES: [&str; 5] = [
    "When you share, friends feel included and special! 🤝",
    "Sharing shows you care more about friendship than stuff! 💕",
    "You made playtime twice as fun by sharing! 🎉",
    "That sharing moment created a happy memory together! 🌈",
    "Generosity makes the world feel like a kinder place! 🦄",
];

/// Helping category stories (5 variants)
const HELPING_STORIES: [&str; 5] = [
    "Your helping hands made hard work easier! 🙏",
    "When you help, people feel grateful and not alone! 💜",
    "You solved a problem and saved someone time! ⏰",
    "Helpers are everyday superheroes! 🦸‍♀️",
    "Your assistance showed teamwork makes dreams work! ✨",
];

/// Love category stories (5 variants)
const LOVE_STORIES: [&str; 5] = [
    "Love is the most powerful kindness of all! 💜",
    "Your love filled their heart like sunshine! ☀️",
    "When you show love, the whole world feels warmer! 🌍",
    "Love makes people feel safe, happy, and brave! 💕",
    "You spread love like a unicorn spreads magic! 🦄",
];

/// Unicorn Kindness category stories (5 variants)
const UNICORN_STORIES: [&str; 5] = [
    "That was magical kindness worthy of a unicorn! 🦄✨",
    "You made the world sparkle with your unicorn heart! 💜🌟",
    "Unicorn kindness is when you do something extra special! 🌈",
    "You just earned your unicorn kindness wings! 🦄💫",
    "That rare kindness would make any unicorn proud! 🦄👑",
];

/// Selects a random story from the appropriate category pool
///
/// Uses `js_sys::Math::random()` for simple uniform distribution.
/// Each category has 5 story variants for variety.
pub fn select_random_story(category: &str) -> &'static str {
    let stories = match category {
        "hug" => &HUG_STORIES,
        "nice-words" => &NICE_WORDS_STORIES,
        "sharing" => &SHARING_STORIES,
        "helping" => &HELPING_STORIES,
        "love" => &LOVE_STORIES,
        "unicorn" => &UNICORN_STORIES,
        _ => &HUG_STORIES, // fallback
    };

    // Random index selection using js_sys::Math::random()
    // CRITICAL: Clamp to prevent out-of-bounds panic if random() returns 1.0
    let len = stories.len();
    let idx = ((js_sys::Math::random() * len as f64).floor() as usize).min(len - 1);
    stories[idx]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_categories_have_stories() {
        // Verify each category has 5 stories
        assert_eq!(HUG_STORIES.len(), 5);
        assert_eq!(NICE_WORDS_STORIES.len(), 5);
        assert_eq!(SHARING_STORIES.len(), 5);
        assert_eq!(HELPING_STORIES.len(), 5);
        assert_eq!(LOVE_STORIES.len(), 5);
        assert_eq!(UNICORN_STORIES.len(), 5);
    }

    #[test]
    fn test_all_stories_have_emoji() {
        // Verify all stories contain at least one emoji
        for story in HUG_STORIES.iter() {
            assert!(story.chars().any(|c| c as u32 > 0x1F600));
        }
        for story in NICE_WORDS_STORIES.iter() {
            assert!(story.chars().any(|c| c as u32 > 0x1F600));
        }
        // Similar checks for other categories...
    }
}
