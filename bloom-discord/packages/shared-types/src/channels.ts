/**
 * The Bloom Labs channel map.
 *
 * Same rule as roles: code refers to channels by key, runtime resolves keys to
 * ids from configuration. Channel *names* are display-only. A bot that posts
 * "wherever the channel called #reports is" will one day post a private report
 * into a public channel someone renamed.
 */
export const CHANNEL_KEYS = [
  // ✦ WELCOME
  'welcome',
  'rules',
  'gettingStarted',
  // 📢 BLOOM UPDATES
  'announcements',
  'releaseNotes',
  'developmentUpdates',
  // 🌿 THE GARDEN
  'introductions',
  'dailyCheckIn',
  'smallWins',
  // 🏆 PROGRESS
  'achievements',
  'milestones',
  'bloomRewards',
  'challenges',
  // 🛠️ BLOOM LAB
  'betaTesting',
  'featureTesting',
  // 💡 IDEAS & FEEDBACK
  'feedback',
  'featureRequests',
  'voting',
  'featureStatus',
  // 🐛 BUGS & SUPPORT
  'bugReports',
  'support',
  // 🔒 BLOOM TEAM (private)
  'moderation',
  'reports',
  'internal',
] as const;

export type ChannelKey = (typeof CHANNEL_KEYS)[number];

export const CHANNEL_DISPLAY_NAMES: Readonly<Record<ChannelKey, string>> = {
  welcome: '#welcome',
  rules: '#rules',
  gettingStarted: '#getting-started',
  announcements: '#announcements',
  releaseNotes: '#release-notes',
  developmentUpdates: '#development-updates',
  introductions: '#introductions',
  dailyCheckIn: '#daily-check-in',
  smallWins: '#small-wins',
  achievements: '#achievements',
  milestones: '#milestones',
  bloomRewards: '#bloom-rewards',
  challenges: '#challenges',
  betaTesting: '#beta-testing',
  featureTesting: '#feature-testing',
  feedback: '#feedback',
  featureRequests: '#feature-requests',
  voting: '#voting',
  featureStatus: '#feature-status',
  bugReports: '#bug-reports',
  support: '#support',
  moderation: '#moderation',
  reports: '#reports',
  internal: '#internal',
};

export const CHANNEL_ENV_KEYS: Readonly<Record<ChannelKey, string>> = {
  welcome: 'CHANNEL_WELCOME',
  rules: 'CHANNEL_RULES',
  gettingStarted: 'CHANNEL_GETTING_STARTED',
  announcements: 'CHANNEL_ANNOUNCEMENTS',
  releaseNotes: 'CHANNEL_RELEASE_NOTES',
  developmentUpdates: 'CHANNEL_DEVELOPMENT_UPDATES',
  introductions: 'CHANNEL_INTRODUCTIONS',
  dailyCheckIn: 'CHANNEL_DAILY_CHECK_IN',
  smallWins: 'CHANNEL_SMALL_WINS',
  achievements: 'CHANNEL_ACHIEVEMENTS',
  milestones: 'CHANNEL_MILESTONES',
  bloomRewards: 'CHANNEL_BLOOM_REWARDS',
  challenges: 'CHANNEL_CHALLENGES',
  betaTesting: 'CHANNEL_BETA_TESTING',
  featureTesting: 'CHANNEL_FEATURE_TESTING',
  feedback: 'CHANNEL_FEEDBACK',
  featureRequests: 'CHANNEL_FEATURE_REQUESTS',
  voting: 'CHANNEL_VOTING',
  featureStatus: 'CHANNEL_FEATURE_STATUS',
  bugReports: 'CHANNEL_BUG_REPORTS',
  support: 'CHANNEL_SUPPORT',
  moderation: 'CHANNEL_MODERATION',
  reports: 'CHANNEL_REPORTS',
  internal: 'CHANNEL_INTERNAL',
};

/**
 * Channels that must never receive member-visible content.
 *
 * The messaging adapter cross-checks any send that carries private material
 * (moderation detail, report content, audit output) against this set, so a
 * mis-configured channel id fails closed instead of publishing a report.
 */
export const PRIVATE_CHANNEL_KEYS: readonly ChannelKey[] = [
  'moderation',
  'reports',
  'internal',
];

export function isChannelKey(value: unknown): value is ChannelKey {
  return typeof value === 'string' && (CHANNEL_KEYS as readonly string[]).includes(value);
}

export function isPrivateChannelKey(key: ChannelKey): boolean {
  return PRIVATE_CHANNEL_KEYS.includes(key);
}
