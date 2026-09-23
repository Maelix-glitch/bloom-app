/**
 * THE WORLD — a declarative blueprint of the Bloom Discord.
 *
 * Every category, channel, role, permission and pinned "world message" lives
 * here as plain data. `setup.ts` makes a real server match it (idempotently),
 * `bot.ts` reads it to know which channel does what, and `preview.ts` renders
 * it to HTML so the world can be reviewed without touching Discord.
 *
 * Voice: calm, warm, editorial — the same register as the app. No hype, no
 * "🔥 WELCOME TO THE BEST SERVER 🔥". The garden speaks softly.
 */

/* --------------------------------- palette -------------------------------- */
/* sRGB conversions of the app's oklch tokens in src/styles.css. */

export const PALETTE = {
  night: 0x12131d, // --background
  surface: 0x1c1d29, // --surface
  violet: 0xa590d9,
  sky: 0x7fa5ce,
  amber: 0xe4ba6a,
  gold: 0xecca8e,
  sage: 0x83ad91,
  rose: 0xcf8fa7,
  cream: 0xf3f0ea, // --foreground
} as const;

/* ---------------------------------- roles --------------------------------- */

export type RoleKey =
  | "gardener"
  | "groundskeeper"
  | "evergreen"
  | "in-bloom"
  | "budding"
  | "sprout"
  | "seedling"
  | "beta"
  | "night-owl"
  | "challenger"
  | "lab-notes"
  | "bloomer";

export interface RoleSpec {
  key: RoleKey;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  /** Guild-level permissions (discord.js PermissionFlagsBits keys). */
  permissions: readonly string[];
  /** Shown in the guide / preview. */
  about: string;
  /** Self-assignable from the guide. */
  optIn?: { emoji: string; description: string };
}

/** Top → bottom. Discord role order matters; setup applies it. */
export const ROLES: readonly RoleSpec[] = [
  {
    key: "gardener",
    name: "Gardener",
    color: PALETTE.gold,
    hoist: true,
    mentionable: false,
    permissions: [
      "ManageGuild", "ManageChannels", "ManageRoles", "ManageMessages", "ManageThreads",
      "ManageEvents", "KickMembers", "BanMembers", "ModerateMembers", "MentionEveryone",
      "ViewAuditLog", "MoveMembers", "MuteMembers",
    ],
    about: "The Bloom team. They planted this place.",
  },
  {
    key: "groundskeeper",
    name: "Groundskeeper",
    color: PALETTE.sage,
    hoist: true,
    mentionable: true,
    permissions: ["ManageMessages", "ManageThreads", "ModerateMembers", "KickMembers", "MoveMembers", "MuteMembers"],
    about: "Moderators. They keep the paths clear and the garden gentle.",
  },
  { key: "evergreen", name: "Evergreen", color: 0xecca8e, hoist: false, mentionable: false, permissions: [], about: "365 days of showing up." },
  { key: "in-bloom", name: "In Bloom", color: 0xa590d9, hoist: false, mentionable: false, permissions: [], about: "100 days of showing up." },
  { key: "budding", name: "Budding", color: 0xcf8fa7, hoist: false, mentionable: false, permissions: [], about: "30 days of showing up." },
  { key: "sprout", name: "Sprout", color: 0x9fc8a8, hoist: false, mentionable: false, permissions: [], about: "7 days of showing up." },
  { key: "seedling", name: "Seedling", color: 0x83ad91, hoist: false, mentionable: false, permissions: [], about: "Everyone begins here." },
  {
    key: "beta",
    name: "Beta Bloomer",
    color: PALETTE.sky,
    hoist: false,
    mentionable: true,
    permissions: [],
    about: "Tests early builds. Granted by the team.",
  },
  {
    key: "night-owl",
    name: "Night Owl",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    about: "Gets a soft ping when the midnight garden opens.",
    optIn: { emoji: "🌙", description: "A soft ping when 🌙・midnight-bloom opens at 22:00" },
  },
  {
    key: "challenger",
    name: "Challenger",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    about: "Hears about new challenges first.",
    optIn: { emoji: "🏆", description: "Hear when a new challenge begins" },
  },
  {
    key: "lab-notes",
    name: "Lab Notes",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    about: "Pinged for design reviews and feedback calls.",
    optIn: { emoji: "🧠", description: "Get pinged when the team wants feedback" },
  },
  {
    key: "bloomer",
    name: "Bloomer",
    color: 0,
    hoist: false,
    mentionable: false,
    permissions: [],
    about: "Stepped through the gate. The whole garden is open to you.",
  },
];

export const RANK_ROLE_KEYS: Record<string, RoleKey> = {
  seedling: "seedling",
  sprout: "sprout",
  budding: "budding",
  "in-bloom": "in-bloom",
  evergreen: "evergreen",
};

/* ------------------------------- permissions ------------------------------ */

/** Who a permission rule targets. `bot` is the bot's own member. */
export type Target = "@everyone" | "bloomer" | "beta" | "team" | "bot";

export interface Rule {
  target: Target;
  allow?: readonly string[];
  deny?: readonly string[];
}

const READ = ["ViewChannel", "ReadMessageHistory"];
const TALK = ["SendMessages", "AddReactions", "AttachFiles", "EmbedLinks", "SendMessagesInThreads", "CreatePublicThreads", "UseApplicationCommands"];
const QUIET = ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"];
const VOICE = ["Connect", "Speak", "Stream", "UseVAD"];

/** The bot sees and tends everything. */
const BOT: Rule = {
  target: "bot",
  allow: [...READ, ...TALK, "ManageMessages", "ManageThreads", "ManageChannels", "ManageRoles", "MentionEveryone", "Connect"],
};
/** The team always has the full garden. */
const TEAM: Rule = { target: "team", allow: [...READ, ...TALK, ...VOICE, "ManageMessages", "ManageThreads"] };

/**
 * Named access profiles. Each channel resolves to exactly one; the rules are
 * written out in full on every channel (no reliance on category sync) so the
 * permissions can be read straight off this file.
 */
export const PROFILES = {
  /** Visible before entering; nobody but the team speaks. */
  threshold: [
    { target: "@everyone", allow: [...READ, "AddReactions"], deny: [...QUIET, "SendMessagesInThreads"] },
    TEAM,
    BOT,
  ],
  /** The gate itself — disappears once you're through. */
  gate: [
    { target: "@everyone", allow: [...READ, "UseApplicationCommands"], deny: [...QUIET, "AddReactions"] },
    { target: "bloomer", deny: ["ViewChannel"] },
    TEAM,
    BOT,
  ],
  /** Inside the garden, open conversation. */
  garden: [
    { target: "@everyone", deny: ["ViewChannel"] },
    { target: "bloomer", allow: [...READ, ...TALK] },
    TEAM,
    BOT,
  ],
  /** Inside the garden, but only the bot/team post top-level; everyone replies in threads. */
  gardenQuiet: [
    { target: "@everyone", deny: ["ViewChannel"] },
    {
      target: "bloomer",
      allow: [...READ, "AddReactions", "SendMessagesInThreads", "CreatePublicThreads", "UseApplicationCommands"],
      deny: ["SendMessages", "CreatePrivateThreads"],
    },
    TEAM,
    BOT,
  ],
  /** Voice rooms. */
  gather: [
    { target: "@everyone", deny: ["ViewChannel"] },
    { target: "bloomer", allow: [...READ, ...VOICE, "SendMessages"] },
    TEAM,
    BOT,
  ],
  /** Silent co-working: cameras and screens yes, voices no. */
  focus: [
    { target: "@everyone", deny: ["ViewChannel"] },
    { target: "bloomer", allow: [...READ, "Connect", "Stream"], deny: ["Speak"] },
    TEAM,
    BOT,
  ],
  /** Early builds. */
  beta: [
    { target: "@everyone", deny: ["ViewChannel"] },
    { target: "beta", allow: [...READ, ...TALK] },
    TEAM,
    BOT,
  ],
  /** Team only. */
  team: [{ target: "@everyone", deny: ["ViewChannel"] }, TEAM, BOT],
} satisfies Record<string, readonly Rule[]>;

export type ProfileKey = keyof typeof PROFILES;

/* --------------------------------- messages ------------------------------- */

export interface EmbedSpec {
  title?: string;
  description: string;
  color?: number;
  fields?: readonly { name: string; value: string; inline?: boolean }[];
  footer?: string;
  /** Banner art from discord/assets/, uploaded with the message. */
  image?: "welcome.jpg" | "gate.jpg" | "midnight.jpg";
}

/** Interactive panels the bot attaches under a world message. */
export type PanelKey = "enter" | "roles" | "checkin" | "goal";

export interface WorldMessage {
  /** Stable id; setup uses it to find and edit (not duplicate) the message. */
  id: string;
  embeds: readonly EmbedSpec[];
  panel?: PanelKey;
  pin?: boolean;
}

/* --------------------------------- channels ------------------------------- */

/** What the bot does in a channel. Channels without a purpose are just rooms. */
export type Purpose =
  | "welcome"
  | "gate"
  | "guide"
  | "rules"
  | "announcements"
  | "checkin"
  | "wins"
  | "support"
  | "moments"
  | "ideas"
  | "bugs"
  | "features"
  | "beta"
  | "challenges"
  | "streaks"
  | "midnight"
  | "goals"
  | "analytics"
  | "moderation";

export type ChannelKind = "text" | "announcement" | "forum" | "voice";

export interface ChannelSpec {
  name: string;
  kind: ChannelKind;
  topic?: string;
  profile: ProfileKey;
  purpose?: Purpose;
  /** Seconds between messages per person. */
  slowmode?: number;
  userLimit?: number;
  /** Forum tags (only used when the server supports forums). */
  tags?: readonly { name: string; emoji?: string }[];
  messages?: readonly WorldMessage[];
}

export interface CategorySpec {
  name: string;
  /** One line shown in the guide and preview. */
  about: string;
  profile: ProfileKey;
  channels: readonly ChannelSpec[];
}

/* --------------------------------- the copy ------------------------------- */

const GUIDE_MAP = [
  "**✦ START HERE** — the threshold. Where every visit begins.",
  "**🌿 THE GARDEN** — the heart of it. Check in, share wins, lean on each other.",
  "**🧠 BLOOM LAB** — where Bloom itself grows. Ideas, bugs, design, betas.",
  "**🏆 CHALLENGES** — gentle momentum. Streaks, goals, and the midnight garden.",
  "**🎮 AFTER HOURS** — the lounge. Games, music, making things, nonsense.",
  "**🎙️ GATHER** — voice rooms. Hang out, stay up, or focus together in silence.",
].join("\n");

export const WORLD: readonly CategorySpec[] = [
  {
    name: "✦ START HERE",
    about: "The threshold. Where every visit begins.",
    profile: "threshold",
    channels: [
      {
        name: "👋・welcome",
        kind: "text",
        profile: "threshold",
        purpose: "welcome",
        topic: "Every seed that lands here gets a hello. 🌱",
        messages: [
          {
            id: "welcome.hero",
            embeds: [
              {
                title: "You found the garden.",
                color: PALETTE.violet,
                image: "welcome.jpg",
                description: [
                  "Bloom is a quiet place to notice how your days actually go — how you slept, what you felt, what you kept showing up for.",
                  "",
                  "This is the part of Bloom where the people live.",
                  "",
                  "No one here is keeping score. Some days you'll bloom, some days you'll just be soil — both count.",
                ].join("\n"),
                footer: "Walk to 🌱・enter-bloom when you're ready.",
              },
            ],
          },
        ],
      },
      {
        name: "🌱・enter-bloom",
        kind: "text",
        profile: "gate",
        purpose: "gate",
        topic: "The edge of the garden. One step and you're in.",
        messages: [
          {
            id: "gate.door",
            pin: true,
            panel: "enter",
            embeds: [
              {
                title: "🌱  The edge of the garden",
                color: PALETTE.sage,
                image: "gate.jpg",
                description: [
                  "Everything past this point is Bloom.",
                  "",
                  "Inside, people check in with how they're feeling, celebrate the small things, ask for help when a day is heavy, and help shape the app itself.",
                  "",
                  "Before you step in, one promise: **tend the garden kindly.**",
                  "That means the few things in 📜・rules — mostly, be gentle with people, including yourself.",
                ].join("\n"),
                footer: "Press the button below. This gate disappears once you're through.",
              },
            ],
          },
        ],
      },
      {
        name: "📖・the-bloom-guide",
        kind: "text",
        profile: "threshold",
        purpose: "guide",
        topic: "A map of the garden, and how to find your way around it.",
        messages: [
          {
            id: "guide.map",
            embeds: [
              {
                title: "📖  A map of the garden",
                color: PALETTE.violet,
                description: GUIDE_MAP,
              },
              {
                title: "🌱  Daily check-in",
                color: PALETTE.sage,
                description: [
                  "Once a day, tell the garden how you are. Tap a feeling in 🌱・daily-check-in (or use `/checkin`) — a word is enough, a note is optional.",
                  "",
                  "Your check-ins grow a streak and, over time, your garden rank:",
                  "🌱 **Seedling** → 🌿 **Sprout** (7 days) → 🌷 **Budding** (30) → 🌸 **In Bloom** (100) → 🌲 **Evergreen** (365)",
                  "",
                  "Ranks count the days you showed up, not a streak you can lose. Missing a day never takes anything away.",
                ].join("\n"),
              },
              {
                title: "✨  Things you can do",
                color: PALETTE.sky,
                description: [
                  "`/checkin` — tell the garden how you are today",
                  "`/garden` — see your own streak, days and rank (only you see it)",
                  "**Right-click a message → Apps → Flag for Groundskeepers** — quietly report something",
                ].join("\n"),
                footer: "There are no public leaderboards here, on purpose. Growth isn't a race.",
              },
            ],
          },
          {
            id: "guide.roles",
            panel: "roles",
            embeds: [
              {
                title: "🔔  Choose what reaches you",
                color: PALETTE.amber,
                description: [
                  "Everything is quiet by default. Pick any of these to hear a little more — change your mind any time.",
                  "",
                  "🌙 **Night Owl** — a soft ping when the midnight garden opens",
                  "🏆 **Challenger** — hear when a new challenge begins",
                  "🧠 **Lab Notes** — get pinged when the team wants your eyes on something",
                ].join("\n"),
              },
            ],
          },
        ],
      },
      {
        name: "📜・rules",
        kind: "text",
        profile: "threshold",
        purpose: "rules",
        topic: "How we tend the garden.",
        messages: [
          {
            id: "rules.all",
            embeds: [
              {
                title: "📜  How we tend the garden",
                color: PALETTE.gold,
                description: "Short on purpose. The spirit matters more than the letter.",
                fields: [
                  { name: "1 · Kindness first", value: "Disagree with ideas, never with people. Assume the best about whoever you're talking to." },
                  { name: "2 · Everyone grows at their own pace", value: "No comparing, no shaming, no \"you should just…\". A small win is a win." },
                  { name: "3 · Support, not treatment", value: "Share, listen, encourage — but no medical or diagnostic advice. If someone may be in danger, point them to real help and ping a Groundskeeper." },
                  { name: "4 · Private stays private", value: "Your mood, sleep and cycle data are yours. Never share someone else's screenshots, DMs or details." },
                  { name: "5 · Safe for everyone", value: "No hate, harassment, NSFW, or content that glorifies self-harm. No exceptions." },
                  { name: "6 · Right place, right season", value: "Keep things in the channel they belong to. No spam or self-promotion without asking the team." },
                ],
                footer: "Groundskeepers tend the garden. Their word is final — and always gentle.",
              },
            ],
          },
        ],
      },
      {
        name: "📢・announcements",
        kind: "announcement",
        profile: "threshold",
        purpose: "announcements",
        topic: "Letters from the garden — releases, news, and what's growing next.",
      },
    ],
  },
  {
    name: "🌿 THE GARDEN",
    about: "The heart of it. Check in, share wins, lean on each other.",
    profile: "garden",
    channels: [
      {
        name: "💬・the-garden",
        kind: "text",
        profile: "garden",
        topic: "The main path. Come as you are. 🌿",
      },
      {
        name: "🌱・daily-check-in",
        kind: "text",
        profile: "gardenQuiet",
        purpose: "checkin",
        topic: "Once a day, tell the garden how you are. Tap a feeling below, or /checkin. Reply in threads.",
        messages: [
          {
            id: "checkin.panel",
            pin: true,
            panel: "checkin",
            embeds: [
              {
                title: "🌱  How are you, today?",
                color: PALETTE.sage,
                description: [
                  "Tap the one that fits. There's no wrong answer and no good or bad day here — just honest ones.",
                  "",
                  "You'll get a chance to add a note, or skip it. Others can reply to your check-in in a thread.",
                ].join("\n"),
                footer: "One check-in per day · the day turns over at midnight garden time",
              },
            ],
          },
        ],
      },
      {
        name: "🌸・small-wins",
        kind: "text",
        profile: "garden",
        purpose: "wins",
        topic: "Drank water? Made the bed? Sent the email? It counts. Post it here. 🌸",
      },
      {
        name: "🫶・support",
        kind: "text",
        profile: "garden",
        purpose: "support",
        slowmode: 10,
        topic: "For heavy days. Be soft here. Not a crisis service — if you're in danger, contact local emergency services.",
        messages: [
          {
            id: "support.care",
            pin: true,
            embeds: [
              {
                title: "🫶  A softer corner",
                color: PALETTE.rose,
                description: [
                  "This is a place to say *today is hard* and be met with kindness.",
                  "",
                  "**If you're sharing:** say as much or as little as you like. You don't owe anyone details.",
                  "**If you're replying:** listen first. Ask before offering advice. Never diagnose.",
                  "",
                  "**If you or someone else is in danger right now**, please reach out beyond this server:",
                  "• Find a free, confidential helpline in your country — https://findahelpline.com",
                  "• Or contact your local emergency number.",
                  "",
                  "Groundskeepers can also be pinged here if something needs a careful hand.",
                ].join("\n"),
                footer: "This community is peer support. It's real, and it matters — and it isn't a replacement for professional care.",
              },
            ],
          },
        ],
      },
      {
        name: "📸・bloom-moments",
        kind: "text",
        profile: "garden",
        purpose: "moments",
        topic: "Screenshots of your Bloom, a sunrise, your desk, your cat. Every post gets its own thread. 📸",
      },
    ],
  },
  {
    name: "🧠 BLOOM LAB",
    about: "Where Bloom itself grows. Ideas, bugs, design, betas.",
    profile: "garden",
    channels: [
      {
        name: "💡・ideas",
        kind: "forum",
        profile: "garden",
        purpose: "ideas",
        topic: "Half-formed is welcome. What would make Bloom feel more like yours?",
        tags: [
          { name: "Seed", emoji: "🌰" },
          { name: "Loved", emoji: "🌸" },
          { name: "Exploring", emoji: "🧪" },
          { name: "Planted", emoji: "🌱" },
        ],
      },
      {
        name: "🐛・bug-reports",
        kind: "forum",
        profile: "garden",
        purpose: "bugs",
        topic: "One bug per post. What happened · what you expected · steps · device (iOS / Android / Web) · app version.",
        tags: [
          { name: "New", emoji: "🆕" },
          { name: "Confirmed", emoji: "🔍" },
          { name: "Fixing", emoji: "🛠️" },
          { name: "Fixed", emoji: "✅" },
          { name: "iOS", emoji: "📱" },
          { name: "Android", emoji: "🤖" },
          { name: "Web", emoji: "🌐" },
        ],
      },
      {
        name: "🎨・design-feedback",
        kind: "text",
        profile: "garden",
        topic: "The team shares work-in-progress here. Honest, kind, specific feedback makes Bloom better.",
      },
      {
        name: "⚙️・feature-requests",
        kind: "forum",
        profile: "garden",
        purpose: "features",
        topic: "Something concrete you want Bloom to do. Search first — then add your 🌸 to posts you'd use.",
        tags: [
          { name: "Requested", emoji: "📝" },
          { name: "Planned", emoji: "🗺️" },
          { name: "In progress", emoji: "🛠️" },
          { name: "Shipped", emoji: "🌸" },
          { name: "Not now", emoji: "🍂" },
        ],
      },
      {
        name: "🧪・beta-testing",
        kind: "text",
        profile: "beta",
        purpose: "beta",
        topic: "Early builds, rough edges. What you see here stays here until it ships.",
        messages: [
          {
            id: "beta.welcome",
            pin: true,
            embeds: [
              {
                title: "🧪  The greenhouse",
                color: PALETTE.sky,
                description: [
                  "You're seeing Bloom before it's ready. Thank you for that.",
                  "",
                  "• Unreleased features stay in this channel — no screenshots outside, please.",
                  "• Report beta bugs here (not in 🐛・bug-reports) with the build number.",
                  "• \"This felt confusing\" is just as useful as \"this crashed\".",
                ].join("\n"),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "🏆 CHALLENGES",
    about: "Gentle momentum. Streaks, goals, and the midnight garden.",
    profile: "garden",
    channels: [
      {
        name: "🏆・active-challenges",
        kind: "text",
        profile: "gardenQuiet",
        purpose: "challenges",
        topic: "Challenges the team opens. Tap Join on any that call to you, and cheer each other on in the threads.",
      },
      {
        name: "🔥・streaks",
        kind: "text",
        profile: "gardenQuiet",
        purpose: "streaks",
        topic: "The garden notices when you keep showing up. Milestones and new ranks appear here.",
      },
      {
        name: "🌙・midnight-bloom",
        kind: "text",
        profile: "garden",
        purpose: "midnight",
        topic: "Opens at 22:00, closes at 05:00. For the ones who are still awake.",
        messages: [
          {
            id: "midnight.about",
            pin: true,
            embeds: [
              {
                title: "🌙  The midnight garden",
                color: PALETTE.violet,
                image: "midnight.jpg",
                description: [
                  "Some flowers only open at night.",
                  "",
                  "This channel is only open from **22:00 to 05:00** garden time. Late thoughts, quiet company, can't-sleep conversations — this is their place.",
                  "",
                  "Grab 🌙 **Night Owl** in 📖・the-bloom-guide for a soft ping when the lanterns come on.",
                ].join("\n"),
                footer: "And if you're here because you can't sleep — be kind to tomorrow-you, too.",
              },
            ],
          },
        ],
      },
      {
        name: "🎯・community-goals",
        kind: "text",
        profile: "gardenQuiet",
        purpose: "goals",
        topic: "Goals the whole garden grows toward together. Every check-in counts.",
        messages: [
          {
            id: "goals.weekly",
            pin: true,
            panel: "goal",
            embeds: [
              {
                title: "🎯  This week's garden",
                color: PALETTE.amber,
                description: "The live progress appears here once the bot is running.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "🎮 AFTER HOURS",
    about: "The lounge. Games, music, making things, nonsense.",
    profile: "garden",
    channels: [
      { name: "☕・lounge", kind: "text", profile: "garden", topic: "Pull up a chair. Anything goes (within the rules). ☕" },
      { name: "🎮・gaming", kind: "text", profile: "garden", topic: "What are you playing? Looking for a group? Cozy games especially welcome." },
      { name: "🎨・creative", kind: "text", profile: "garden", topic: "Drawings, writing, photos, playlists, projects — share the things you make." },
      { name: "🎵・music", kind: "text", profile: "garden", topic: "What's on repeat? Songs for focus, for walking, for 2am." },
      { name: "😂・chaos", kind: "text", profile: "garden", topic: "Memes and nonsense. The only rule-bending here is the vibe. The rules still apply." },
    ],
  },
  {
    name: "🎙️ GATHER",
    about: "Voice rooms. Hang out, stay up, or focus together in silence.",
    profile: "gather",
    channels: [
      { name: "🌱・Garden Lounge", kind: "voice", profile: "gather" },
      { name: "☕・Late Night", kind: "voice", profile: "gather" },
      { name: "🎮・Gaming", kind: "voice", profile: "gather" },
      { name: "🎧・Focus Room", kind: "voice", profile: "focus", userLimit: 25 },
    ],
  },
  {
    name: "🔒 BLOOM TEAM",
    about: "Only the team can see this.",
    profile: "team",
    channels: [
      { name: "📊・analytics", kind: "text", profile: "team", purpose: "analytics", topic: "A daily digest of what the garden actually did — counted, never estimated." },
      { name: "🚨・moderation", kind: "text", profile: "team", purpose: "moderation", topic: "Joins, entries, leaves, and flagged messages." },
      { name: "🧪・internal-testing", kind: "text", profile: "team", topic: "Builds before beta." },
      { name: "📝・team-chat", kind: "text", profile: "team", topic: "Us." },
    ],
  },
];

/* --------------------------------- lookups -------------------------------- */

export function allChannels(): ChannelSpec[] {
  return WORLD.flatMap((c) => c.channels);
}

export function channelFor(purpose: Purpose): ChannelSpec {
  const ch = allChannels().find((c) => c.purpose === purpose);
  if (!ch) throw new Error(`No channel has purpose "${purpose}"`);
  return ch;
}

export function role(key: RoleKey): RoleSpec {
  const r = ROLES.find((x) => x.key === key);
  if (!r) throw new Error(`Unknown role "${key}"`);
  return r;
}

export const SERVER_NAME = "Bloom";
