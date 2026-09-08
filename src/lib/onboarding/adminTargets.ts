/**
 * Where the admin door actually goes.
 *
 * The first version of "Launch as admin" was a ghost link in the corner that
 * dumped you on the home page with a dead `admin: true` flag nobody read. That
 * isn't an admin door, it's a skip button wearing a shield.
 *
 * A real one answers the question the person pressing it actually has: *I am
 * building this — let me get to the part I'm working on.* So it opens a panel
 * of the places that are otherwise hard to reach, and it turns the flag into
 * something with consequences (see `isAdmin`).
 *
 * The list is data so it stays honest: every entry is a route that exists in
 * this repo. Nothing here is a stub.
 */

export interface AdminTarget {
  id: string;
  label: string;
  /** One line: what you'd come here to do. */
  detail: string;
  to: string;
  /** Grouping in the panel. */
  group: "app" | "design" | "tools";
}

export const ADMIN_TARGETS: AdminTarget[] = [
  /* --- the app proper, for a quick look at the real thing --- */
  { id: "home", label: "Today", detail: "The home screen, as a user sees it.", to: "/", group: "app" },
  {
    id: "trackers",
    label: "Trackers",
    detail: "The six daily trackers and their goals.",
    to: "/trackers",
    group: "app",
  },
  {
    id: "cycle",
    label: "Cycle",
    detail: "Predictions, phases, the daily log.",
    to: "/cycle",
    group: "app",
  },
  { id: "mood", label: "Mood", detail: "Check-ins and the journey chart.", to: "/mood", group: "app" },
  {
    id: "coach",
    label: "Coach",
    detail: "The conversation, with the model picker.",
    to: "/coach",
    group: "app",
  },
  {
    id: "profile",
    label: "Profile",
    detail: "Identity, settings, data controls.",
    to: "/profile",
    group: "app",
  },

  /* --- design surfaces that no navigation links to --- */
  {
    id: "cycle-styles",
    label: "Cycle themes",
    detail: "All five directions side by side.",
    to: "/cycle-styles",
    group: "design",
  },
  {
    id: "trackers-styles",
    label: "Tracker designs",
    detail: "The alternative tracker layouts.",
    to: "/trackers-styles",
    group: "design",
  },
  {
    id: "trackers-premium",
    label: "Trackers (premium)",
    detail: "The premium tracker treatment.",
    to: "/trackers-premium",
    group: "design",
  },
  {
    id: "cycle-classic",
    label: "Cycle (classic)",
    detail: "The previous cycle page, kept for reference.",
    to: "/cycle-classic",
    group: "design",
  },

  /* --- actual tools --- */
  {
    id: "admin-rewards",
    label: "Reward admin",
    detail: "Create and publish rewards to chosen users.",
    to: "/admin/rewards",
    group: "tools",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    detail: "The analytics overview.",
    to: "/dashboard",
    group: "tools",
  },
];

export const ADMIN_GROUP_LABEL: Record<AdminTarget["group"], string> = {
  app: "The app",
  design: "Design surfaces",
  tools: "Tools",
};

export const adminTargetsByGroup = (): Array<{
  group: AdminTarget["group"];
  label: string;
  items: AdminTarget[];
}> =>
  (["app", "design", "tools"] as const).map((group) => ({
    group,
    label: ADMIN_GROUP_LABEL[group],
    items: ADMIN_TARGETS.filter((t) => t.group === group),
  }));
