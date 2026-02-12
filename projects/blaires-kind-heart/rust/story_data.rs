//! 5 pre-bundled stories as static Rust data. Zero allocation at runtime.
//! Each story has branching pages with choices that have kindness values.

pub struct Story {
    pub id: &'static str,
    pub title: &'static str,
    pub cover_emoji: &'static str,
    pub cover_color: &'static str,
    pub cover_image: Option<&'static str>,
    pub pages: &'static [Page],
}

pub struct Page {
    pub illustration_emoji: &'static str,
    pub illustration_image: Option<&'static str>,
    pub text: &'static str,
    pub choices: &'static [Choice],
}

pub struct Choice {
    pub text: &'static str,
    pub next_page: usize,
    pub kind_value: u8,
}

pub static ALL_STORIES: &[Story] = &[
    Story {
        id: "lost-bunny",
        title: "The Lost Bunny",
        cover_emoji: "\u{1F430}\u{1F33F}\u{1F338}",
        cover_color: "#E0F5E8",
        cover_image: Some("./illustrations/stories/lost-bunny-cover.png"),
        pages: &[
            Page {
                illustration_emoji: "\u{1F331}\u{1F430}\u{1F4A7}\u{1F33F}\u{1F338}",
                illustration_image: Some("./illustrations/stories/lost-bunny-1.png"),
                text: "Blaire finds a little bunny who looks lost and sad in the garden.",
                choices: &[
                    Choice { text: "Help the bunny find its family", next_page: 1, kind_value: 2 },
                    Choice { text: "Give the bunny a gentle pat", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F333}\u{1F407}\u{1F407}\u{1F407}\u{2764}\u{FE0F}\u{1F33F}",
                illustration_image: None,
                text: "Blaire walks carefully through the garden, and the bunny hops behind her. They find the bunny family under the big oak tree!",
                choices: &[
                    Choice { text: "Wave goodbye to the bunnies", next_page: 3, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F33F}\u{1F407}\u{1F49B}\u{270B}\u{1F338}",
                illustration_image: None,
                text: "The bunny nuzzles Blaire's hand. It seems happier now but still looks around for its family.",
                choices: &[
                    Choice { text: "Help it look for its family", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F333}\u{1F407}\u{1F407}\u{1F407}\u{1F49C}\u{2728}\u{1F31F}",
                illustration_image: Some("./illustrations/stories/lost-bunny-end.png"),
                text: "The bunny family is together again! They wiggle their noses to say thank you. Blaire feels warm and happy inside.",
                choices: &[],
            },
        ],
    },
    Story {
        id: "rainy-day",
        title: "The Rainy Day Friend",
        cover_emoji: "\u{1F327}\u{FE0F}\u{2602}\u{FE0F}\u{1F46B}",
        cover_color: "#E0F0FF",
        cover_image: Some("./illustrations/stories/rainy-day-cover.png"),
        pages: &[
            Page {
                illustration_emoji: "\u{1F327}\u{FE0F}\u{1F4A7}\u{1F614}\u{1F4A7}\u{1F327}\u{FE0F}",
                illustration_image: None,
                text: "It's raining outside and Blaire sees a friend standing without an umbrella.",
                choices: &[
                    Choice { text: "Share your umbrella", next_page: 1, kind_value: 2 },
                    Choice { text: "Wave and smile at them", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{2602}\u{FE0F}\u{1F46B}\u{1F4A6}\u{1F602}\u{1F327}\u{FE0F}",
                illustration_image: Some("./illustrations/stories/rainy-day-sharing.png"),
                text: "Blaire runs over and shares her umbrella. They walk together, laughing and splashing in tiny puddles!",
                choices: &[
                    Choice { text: "Invite them inside for hot cocoa", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F44B}\u{1F60A}\u{1F327}\u{FE0F}\u{1F4A7}\u{1F914}",
                illustration_image: None,
                text: "The friend smiles back! But they're still getting wet. Maybe there's more Blaire can do...",
                choices: &[
                    Choice { text: "Run over with the umbrella", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F3E0}\u{2615}\u{2615}\u{1F46B}\u{1F602}\u{2728}",
                illustration_image: Some("./illustrations/stories/rainy-day-end.png"),
                text: "They sit inside with warm cocoa, sharing stories and giggles. What a wonderful rainy day it turned out to be!",
                choices: &[],
            },
        ],
    },
    Story {
        id: "garden-surprise",
        title: "The Garden Surprise",
        cover_emoji: "\u{1F33B}\u{1F33A}\u{1F337}\u{1F490}",
        cover_color: "#FFF8D6",
        cover_image: Some("./illustrations/stories/garden-surprise-cover.png"),
        pages: &[
            Page {
                illustration_emoji: "\u{1F33B}\u{1F4A7}\u{1F33A}\u{1F4A7}\u{1F337}\u{1F614}",
                illustration_image: None,
                text: "Blaire notices the flowers in grandma's garden look droopy and thirsty.",
                choices: &[
                    Choice { text: "Water the flowers carefully", next_page: 1, kind_value: 2 },
                    Choice { text: "Tell grandma about the flowers", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1FAD7}\u{1F4A7}\u{1F33A}\u{2728}\u{1F33B}\u{1F60A}",
                illustration_image: Some("./illustrations/stories/garden-watering.png"),
                text: "Blaire gets the watering can and waters each flower gently. They start to perk up and look happy!",
                choices: &[
                    Choice { text: "Pick a flower for grandma", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F475}\u{1F49B}\u{1FAD7}\u{1F33B}\u{1F33A}\u{1F337}",
                illustration_image: None,
                text: "Grandma says 'Thank you for noticing, sweetie! Want to help me water them together?'",
                choices: &[
                    Choice { text: "Water the flowers with grandma", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F33B}\u{1F33A}\u{1F337}\u{1F490}\u{1F917}\u{2764}\u{FE0F}\u{2728}",
                illustration_image: Some("./illustrations/stories/garden-end.png"),
                text: "The garden looks beautiful now! Grandma gives Blaire a big hug. 'You have the kindest heart,' she says.",
                choices: &[],
            },
        ],
    },
    Story {
        id: "new-kid",
        title: "The New Kid",
        cover_emoji: "\u{1F3EB}\u{1F44B}\u{1F60A}",
        cover_color: "#EDE0FF",
        cover_image: Some("./illustrations/stories/new-kid-cover.png"),
        pages: &[
            Page {
                illustration_emoji: "\u{1F3EB}\u{1F6DD}\u{1F9D2}\u{1F614}\u{1F343}",
                illustration_image: Some("./illustrations/stories/new-kid-alone.png"),
                text: "There's a new kid at the playground who's sitting alone. They look a little nervous.",
                choices: &[
                    Choice { text: "Go say hi and introduce yourself", next_page: 1, kind_value: 2 },
                    Choice { text: "Smile and wave from your swing", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F44B}\u{1F60A}\u{1F929}\u{2728}\u{1F3EB}",
                illustration_image: None,
                text: "'Hi! I'm Blaire! Do you want to play?' The new kid's face lights up with a big smile!",
                choices: &[
                    Choice { text: "Play together on the swings", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F44B}\u{1F633}\u{1F343}\u{1F6DD}",
                illustration_image: None,
                text: "The new kid waves back shyly. Maybe Blaire should go over and talk to them...",
                choices: &[
                    Choice { text: "Walk over and say hi", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F91D}\u{1F46B}\u{1F31F}\u{1F389}\u{1F308}\u{2728}",
                illustration_image: Some("./illustrations/stories/new-kid-end.png"),
                text: "They play together all afternoon! 'Thank you for being my friend,' says the new kid. Blaire made someone's day!",
                choices: &[],
            },
        ],
    },
    Story {
        id: "sharing-lunch",
        title: "Sharing is Caring",
        cover_emoji: "\u{1F96A}\u{1F46B}\u{2764}\u{FE0F}",
        cover_color: "#FFF0F5",
        cover_image: Some("./illustrations/stories/sharing-lunch-cover.png"),
        pages: &[
            Page {
                illustration_emoji: "\u{1F354}\u{1F96A}\u{1F614}\u{1F4AD}\u{1F3EB}",
                illustration_image: None,
                text: "At lunchtime, Blaire notices a friend forgot their lunchbox at home. They look hungry and sad.",
                choices: &[
                    Choice { text: "Share half of your lunch", next_page: 1, kind_value: 2 },
                    Choice { text: "Ask a grownup to help", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F96A}\u{1F46B}\u{1F60A}\u{2764}\u{FE0F}\u{2728}",
                illustration_image: Some("./illustrations/stories/sharing-lunch-offer.png"),
                text: "'Here, you can have half of my sandwich!' Blaire's friend smiles big. They eat together and share stories.",
                choices: &[
                    Choice { text: "Share your cookie too", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F469}\u{200D}\u{1F3EB}\u{1F44D}\u{1F34E}\u{1F60A}",
                illustration_image: None,
                text: "The teacher helps find a snack. 'Good job looking out for your friend, Blaire!'",
                choices: &[
                    Choice { text: "Sit with your friend at lunch", next_page: 3, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "\u{1F36A}\u{1F46B}\u{2764}\u{FE0F}\u{1F31F}\u{1F389}\u{2728}",
                illustration_image: Some("./illustrations/stories/sharing-lunch-end.png"),
                text: "Lunch was the best part of the day! Sharing made the food taste even better. Kindness fills tummies AND hearts!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 6: The Unicorn Forest (magical/unicorn theme)
    Story {
        id: "unicorn-forest",
        title: "The Unicorn Forest",
        cover_emoji: "🦄🌲✨",
        cover_color: "#F5E6FF",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🦄😢🌲💫",
                illustration_image: None,
                text: "Blaire meets a lonely unicorn in the magical forest. The unicorn has no friends to play with.",
                choices: &[
                    Choice { text: "Ask the unicorn to be your friend", next_page: 1, kind_value: 2 },
                    Choice { text: "Give the unicorn a gentle pat", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🦄💜✨🌈",
                illustration_image: None,
                text: "The unicorn's horn glows with rainbow light! 'You're the first friend I've had in so long,' it says.",
                choices: &[
                    Choice { text: "Help find more friends", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🦄💫😊",
                illustration_image: None,
                text: "The unicorn nuzzles close. It feels a little better but still seems lonely...",
                choices: &[
                    Choice { text: "Offer to be best friends", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🦄🦄🦄✨🌈💖",
                illustration_image: None,
                text: "Other unicorns appear from the forest! They all play together. The unicorn's magic sparkles everywhere. Friendship is the most magical thing!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 7: The Lonely Dragon (magical theme)
    Story {
        id: "lonely-dragon",
        title: "The Lonely Dragon",
        cover_emoji: "🐉💚🏰",
        cover_color: "#E8F5E9",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🐉😢🏰💭",
                illustration_image: None,
                text: "Everyone is scared of the dragon, but Blaire sees it looks sad and lonely. The dragon just wants a friend!",
                choices: &[
                    Choice { text: "Go talk to the dragon bravely", next_page: 1, kind_value: 2 },
                    Choice { text: "Wave hello from far away", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🐉😊💚✨",
                illustration_image: None,
                text: "'Hi, dragon! I'm Blaire!' The dragon smiles big. 'You're not scared of me?' it asks, surprised.",
                choices: &[
                    Choice { text: "Invite the dragon to play", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👋🐉💚",
                illustration_image: None,
                text: "The dragon waves back with its wing! It looks hopeful. Maybe Blaire should get closer...",
                choices: &[
                    Choice { text: "Walk over to the dragon", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🐉💚👧✨🎈🌈",
                illustration_image: None,
                text: "They play hide-and-seek in the clouds! The dragon gives Blaire rides on its back. Being kind helped Blaire find the best friend ever!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 8: Fairy Village Help (magical theme)
    Story {
        id: "fairy-village",
        title: "Fairy Village Help",
        cover_emoji: "🧚🏡✨",
        cover_color: "#FFF9E6",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🧚😰🏡💫",
                illustration_image: None,
                text: "The fairy village is messy after a big wind storm! The fairies need help cleaning up their tiny homes.",
                choices: &[
                    Choice { text: "Help tidy up right away", next_page: 1, kind_value: 2 },
                    Choice { text: "Ask what they need help with", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🧚🏡✨🧹",
                illustration_image: None,
                text: "Blaire carefully picks up tiny sticks and leaves. The fairies flutter around happily, 'Thank you!'",
                choices: &[
                    Choice { text: "Help rebuild their flower houses", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🧚💬🏡",
                illustration_image: None,
                text: "'Could you help us pick up the fallen flowers?' the head fairy asks politely.",
                choices: &[
                    Choice { text: "Start helping right away", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🏡🌸🧚✨🎉💖",
                illustration_image: None,
                text: "The village looks beautiful again! The fairies sprinkle magic dust on Blaire. 'You have a heart as kind as any fairy!' they sing.",
                choices: &[],
            },
        ],
    },
    // NEW STORY 9: Sibling Adventure Day (family/friendship theme)
    Story {
        id: "sibling-adventure",
        title: "Sibling Adventure",
        cover_emoji: "👧👦🌳",
        cover_color: "#E3F2FD",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "👦😔🎮🏠",
                illustration_image: None,
                text: "Blaire's little brother wants to play, but Blaire was planning to play alone.",
                choices: &[
                    Choice { text: "Invite brother on an adventure", next_page: 1, kind_value: 2 },
                    Choice { text: "Let him play nearby", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "👧👦🌳✨🗺️",
                illustration_image: None,
                text: "'Let's go on a treasure hunt!' Blaire says. Her brother's eyes light up with excitement!",
                choices: &[
                    Choice { text: "Make him the captain", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👦😊🧸",
                illustration_image: None,
                text: "Her brother plays with his toys next to her. He looks over hopefully, still wanting to join in...",
                choices: &[
                    Choice { text: "Ask him to join the adventure", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👧👦💎🏆✨🎉",
                illustration_image: None,
                text: "They find 'treasure' (pretty rocks) together! Brother gives Blaire the biggest hug. Best adventure day ever!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 10: Grandpa's Special Day (family theme)
    Story {
        id: "grandpa-day",
        title: "Grandpa's Special Day",
        cover_emoji: "👴💙🎈",
        cover_color: "#E0F7FA",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "👴📖😔",
                illustration_image: None,
                text: "Grandpa is sitting alone reading. It's his birthday but he seems a little lonely.",
                choices: &[
                    Choice { text: "Plan a surprise party", next_page: 1, kind_value: 2 },
                    Choice { text: "Keep him company", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🎈🎉👴😊",
                illustration_image: None,
                text: "Blaire gathers the family for a surprise! They bring cake, balloons, and lots of love.",
                choices: &[
                    Choice { text: "Give grandpa a big hug", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👴👧📖😊",
                illustration_image: None,
                text: "Blaire sits with grandpa. 'Would you read me a story?' Grandpa smiles warmly.",
                choices: &[
                    Choice { text: "Tell him about your day", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👴💙👧🎂✨🎉",
                illustration_image: None,
                text: "Grandpa laughs and smiles all day. 'You made this the best birthday ever!' he says with happy tears. Love makes everything special!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 11: The New Neighbor (family/friendship theme)
    Story {
        id: "new-neighbor",
        title: "The New Neighbor",
        cover_emoji: "🏠👋😊",
        cover_color: "#FFF8DC",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🏠📦👨‍👩‍👧😰",
                illustration_image: None,
                text: "A new family just moved in next door! They look tired from moving and could use some help.",
                choices: &[
                    Choice { text: "Bring them cookies to welcome them", next_page: 1, kind_value: 2 },
                    Choice { text: "Wave hello from the yard", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🍪👋😊🏠",
                illustration_image: None,
                text: "'Welcome to the neighborhood!' Blaire says, offering cookies. The family smiles big. 'How thoughtful!'",
                choices: &[
                    Choice { text: "Help carry a light box", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👋😊🏠",
                illustration_image: None,
                text: "The neighbors wave back kindly. They still look like they could use help with all those boxes...",
                choices: &[
                    Choice { text: "Offer to help them", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🏠👨‍👩‍👧‍👦💚🎉✨",
                illustration_image: None,
                text: "The family is all moved in! The new neighbor kids ask Blaire to play. Being kind made new best friends!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 12: The Lost Puppy (family/friendship theme)
    Story {
        id: "lost-puppy",
        title: "The Lost Puppy",
        cover_emoji: "🐕💙🏡",
        cover_color: "#FFF0E0",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🐕😢❓",
                illustration_image: None,
                text: "Blaire finds a puppy with no collar wandering around. It looks lost and scared.",
                choices: &[
                    Choice { text: "Help the puppy find home", next_page: 1, kind_value: 2 },
                    Choice { text: "Pet the puppy gently", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🐕👧🚶‍♀️🏘️",
                illustration_image: None,
                text: "Blaire walks through the neighborhood, showing neighbors the puppy. 'Have you seen this puppy?'",
                choices: &[
                    Choice { text: "Keep looking for the owner", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🐕😊💙",
                illustration_image: None,
                text: "The puppy wags its tail and licks Blaire's hand. It feels safer now but still needs to find its home...",
                choices: &[
                    Choice { text: "Search for its family", next_page: 1, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🐕👨‍👩‍👧💙🎉✨",
                illustration_image: None,
                text: "A family runs up! 'You found Buddy!' They hug their puppy and thank Blaire. Buddy gives Blaire puppy kisses. A hero's work is done!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 13: Library Helper (everyday kindness theme)
    Story {
        id: "library-helper",
        title: "Library Helper",
        cover_emoji: "📚🏫✨",
        cover_color: "#E1F5FE",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "📚😰📖",
                illustration_image: None,
                text: "The librarian has SO many books scattered everywhere! They need to be put back on the shelves.",
                choices: &[
                    Choice { text: "Offer to help organize books", next_page: 1, kind_value: 2 },
                    Choice { text: "Ask how you can help", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "📚👧📖✨",
                illustration_image: None,
                text: "Blaire carefully puts books back where they belong. The librarian smiles, 'You're such a good helper!'",
                choices: &[
                    Choice { text: "Help make a reading corner cozy", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "📚💬😊",
                illustration_image: None,
                text: "'Could you help put these picture books on the bottom shelf?' the librarian asks.",
                choices: &[
                    Choice { text: "Start organizing right away", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "📚📖✨🎉💙",
                illustration_image: None,
                text: "The library looks perfect! The librarian gives Blaire her own special library helper badge. 'Thank you for caring!' Helping feels amazing!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 14: Park Clean-Up (everyday kindness theme)
    Story {
        id: "park-cleanup",
        title: "Park Clean-Up",
        cover_emoji: "🌳🗑️💚",
        cover_color: "#E8F5E9",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "🌳🗑️😔",
                illustration_image: None,
                text: "Blaire's favorite park has trash all over. It's not beautiful like it used to be!",
                choices: &[
                    Choice { text: "Start picking up trash", next_page: 1, kind_value: 2 },
                    Choice { text: "Tell friends about it", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "👧🗑️💚🌳",
                illustration_image: None,
                text: "Blaire picks up trash and puts it in the bin. The park already looks nicer!",
                choices: &[
                    Choice { text: "Get friends to help too", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "👧👦👧💬",
                illustration_image: None,
                text: "'The park is messy! Want to help clean it?' Blaire asks friends.",
                choices: &[
                    Choice { text: "Lead the clean-up crew", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🌳✨👧👦👧🎉💚",
                illustration_image: None,
                text: "Everyone works together! The park is beautiful again. The whole neighborhood thanks them. Teamwork + kindness = amazing results!",
                choices: &[],
            },
        ],
    },
    // NEW STORY 15: Birthday Surprise (everyday kindness theme)
    Story {
        id: "birthday-surprise",
        title: "Birthday Surprise",
        cover_emoji: "🎂🎁😊",
        cover_color: "#FCE4EC",
        cover_image: None,
        pages: &[
            Page {
                illustration_emoji: "👧😔🎂❓",
                illustration_image: None,
                text: "Blaire's friend's birthday is tomorrow, but they think everyone forgot! How can Blaire help?",
                choices: &[
                    Choice { text: "Plan a secret surprise party", next_page: 1, kind_value: 2 },
                    Choice { text: "Make a birthday card", next_page: 2, kind_value: 1 },
                ],
            },
            Page {
                illustration_emoji: "🎈🎁🎂😊",
                illustration_image: None,
                text: "Blaire gets everyone together to plan the party! They make decorations and wrap presents.",
                choices: &[
                    Choice { text: "Bake a special birthday cake", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🎨✂️💌",
                illustration_image: None,
                text: "Blaire makes the most beautiful card with hearts and glitter! But there's still more they could do...",
                choices: &[
                    Choice { text: "Throw a surprise party too", next_page: 3, kind_value: 2 },
                ],
            },
            Page {
                illustration_emoji: "🎂🎉🎈😭💖✨",
                illustration_image: None,
                text: "'SURPRISE!' everyone shouts! The friend cries happy tears. 'This is the best birthday EVER!' Kindness makes the best gifts!",
                choices: &[],
            },
        ],
    },
];

pub fn get_story(id: &str) -> Option<&'static Story> {
    ALL_STORIES.iter().find(|s| s.id == id)
}
