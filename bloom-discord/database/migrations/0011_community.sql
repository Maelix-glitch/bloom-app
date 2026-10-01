-- =============================================================================
-- 0011_community.sql — challenges and events, on one participation model
-- =============================================================================
--
-- Two tables for two features, deliberately. A challenge and an event are
-- different things to a member and almost the same thing to the platform:
-- both are bounded by time, both produce a per-member participation record,
-- both complete exactly once, both pay through the ledger, both may unlock an
-- achievement, both are audited. The part that differs is how completion is
-- decided — which is a column, not a schema.
--
-- So: `community_activities` holds both kinds, discriminated by `kind`, and
-- `community_participants` holds the one participation record either can
-- produce. The alternative — `community_challenges` and `community_events`
-- side by side — would have duplicated the capacity logic, the completion
-- guard, the reward join and every index, and the two copies would have
-- drifted the first time one grew a column.
--
-- ## Why a discriminated table is safe here
--
-- The usual objection to one table per two concepts is that it permits
-- nonsense rows: an event with a target metric, a challenge with a capacity.
-- Every one of those states is refused by a CHECK below, so the nonsense is
-- unrepresentable rather than merely discouraged. If the two kinds ever stop
-- sharing a shape, the CHECKs are where that shows up first.
--
-- ## What is NOT here
--
-- No recurrence, no templates, no expression language for targets, no reminder
-- schedule, no per-activity channel override, no RSVP waitlist. Each of those
-- is a feature with its own failure modes; none of them is needed to run a
-- challenge or an event, and every one of them is easier to add later than to
-- remove.
--
-- No RLS. Consistent with every other table in this schema: all three bots
-- connect as the same role, and the boundary is the compile-time repository
-- manifest (BOT_REPOSITORY_CAPABILITIES in @bloom/database), with the residual
-- runtime risk documented in the capability audit rather than hidden.
--
-- ## Who may do what
--
-- Companion owns both tables outright: it creates activities, records
-- participation, decides completion and pays. Guardian gets nothing — it has
-- no reason to read a member's event attendance, and the referral handoff
-- already proves cross-bot facts can travel without shared table access. Labs
-- gets nothing.

CREATE TABLE IF NOT EXISTS bloom_discord.community_activities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  guild_id            text NOT NULL,

  -- Which of the two this is. Everything conditional below keys off it.
  --   challenge   an objective a member completes by doing something countable
  --   event       a gathering a member signs up for
  kind                text NOT NULL CHECK (kind IN ('challenge', 'event')),

  title               text NOT NULL
                      CHECK (char_length(title) BETWEEN 3 AND 100),
  description         text NOT NULL
                      CHECK (char_length(description) BETWEEN 3 AND 1000),

  -- The window. Both kinds have one; neither may be open-ended.
  --
  -- An activity with no end is a thing nobody ever closes, and an unclosed
  -- challenge pays out forever. Requiring an end date is cheaper than
  -- discovering that in production.
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,

  -- The lifecycle staff controls, kept separate from the clock on purpose.
  --
  -- `status` answers "has a human finished with this", and time answers "is it
  -- running right now". Folding them together would mean either a background
  -- job mutating rows to stay truthful, or a status column that silently
  -- disagrees with `ends_at`. Derived state is computed at read time instead.
  --
  --   open        accepting participation, nothing paid yet
  --   completed   closed by staff; participants were paid
  --   cancelled   closed by staff; nobody was paid
  status              text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'completed', 'cancelled')),

  -- Challenge only. A closed set of metrics the platform can actually compute
  -- from records Companion already owns — there is deliberately no expression
  -- language here, because a DSL is a parser, an evaluator and a new class of
  -- bug in exchange for targets nobody asked for.
  --
  --   check_ins             check-in point events inside the window
  --   qualified_referrals   referrals paid inside the window
  --   event_participation   completed event participations inside the window
  target_metric       text CHECK (target_metric IS NULL OR target_metric IN (
                        'check_ins',
                        'qualified_referrals',
                        'event_participation'
                      )),
  target_amount       integer CHECK (target_amount IS NULL OR target_amount > 0),

  -- Event only. NULL means unlimited, which is a real answer and not a missing
  -- one: most community events have no seat limit.
  capacity            integer CHECK (capacity IS NULL OR capacity > 0),

  -- What completing pays. Zero is permitted and is the honest default for an
  -- activity that is its own reward. The upper bound is a guard against a
  -- mistyped staff input becoming an economy event; the service validates the
  -- same number against a shared constant.
  reward_points       integer NOT NULL DEFAULT 0
                      CHECK (reward_points BETWEEN 0 AND 500),

  -- An achievement completing this may unlock. Recognition only — the award
  -- itself pays nothing, which is enforced in the award definitions rather
  -- than here. Same key shape as member_awards.award_key so a typo cannot
  -- reference an award that could never exist.
  achievement_key     text CHECK (achievement_key IS NULL
                      OR achievement_key ~ '^[a-z][a-z0-9_.]{2,60}$'),

  created_by          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  closed_by           text,
  closed_at           timestamptz,

  correlation_id      text,

  -- Redundant for correctness — `id` is already the primary key — and
  -- required by Postgres before `community_participants` can declare a
  -- composite foreign key on (activity_id, guild_id). Declared here rather
  -- than bolted on afterwards so the reference is valid the moment the child
  -- table is created.
  CONSTRAINT community_activities_id_guild_key UNIQUE (id, guild_id),

  -- The window must be a window.
  CONSTRAINT community_activities_window
    CHECK (ends_at > starts_at),

  -- A challenge is exactly the rows that have a target, and an event is
  -- exactly the rows that do not. Neither kind can borrow the other's columns.
  CONSTRAINT community_activities_challenge_shape
    CHECK (
      kind <> 'challenge'
      OR (target_metric IS NOT NULL AND target_amount IS NOT NULL AND capacity IS NULL)
    ),
  CONSTRAINT community_activities_event_shape
    CHECK (
      kind <> 'event'
      OR (target_metric IS NULL AND target_amount IS NULL)
    ),

  -- Closing is a single fact: both columns or neither, and only when closed.
  -- Without this a row could claim to be completed with no record of who did
  -- it, which is precisely the audit question that gets asked later.
  CONSTRAINT community_activities_closure
    CHECK (
      (status = 'open' AND closed_at IS NULL AND closed_by IS NULL)
      OR (status <> 'open' AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
    )
);

-- The listing query: active and upcoming activities of one kind, newest
-- window first. Covers both the staff list and the member list, which ask the
-- same question with a different projection.
CREATE INDEX IF NOT EXISTS community_activities_guild_kind_idx
  ON bloom_discord.community_activities (guild_id, kind, status, ends_at DESC, id DESC);

-- Challenge evaluation runs after a member action and asks only for open
-- challenges whose window contains now. Partial, because completed and
-- cancelled rows are never evaluated and there will eventually be far more of
-- them than open ones.
CREATE INDEX IF NOT EXISTS community_activities_open_window_idx
  ON bloom_discord.community_activities (guild_id, kind, starts_at, ends_at)
  WHERE status = 'open';

COMMENT ON TABLE bloom_discord.community_activities IS
  'Challenges and events on one model. Companion owns this table; Guardian and Labs have no access. Payment happens in point_events, never here.';

-- =============================================================================
-- Participation
-- =============================================================================
--
-- One row per member per activity, and the primary key is the anti-abuse rule:
-- joining twice, completing twice and being paid twice are all the same
-- duplicate row, refused by the database rather than by a service remembering
-- to check.
--
-- Both kinds write here, at different moments. An event creates the row when
-- a member joins and updates it when the event completes. A challenge has no
-- join step — participation is implicit in what the member was already doing —
-- so it creates the row at completion, already in state `completed`. That
-- asymmetry is why `joined_at` means "when this record began" rather than
-- "when they pressed join".

CREATE TABLE IF NOT EXISTS bloom_discord.community_participants (
  activity_id         uuid NOT NULL
                      REFERENCES bloom_discord.community_activities(id) ON DELETE CASCADE,

  -- Denormalised from the parent so guild-scoped reads and deletes never need
  -- the join. Kept honest by the composite foreign key below.
  guild_id            text NOT NULL,

  user_id             text NOT NULL,

  --   joined      signed up, not yet paid (events only)
  --   completed   finished and paid, or finished with a zero reward
  --   withdrawn   left before completion; cannot be paid
  state               text NOT NULL DEFAULT 'joined'
                      CHECK (state IN ('joined', 'completed', 'withdrawn')),

  joined_at           timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,

  -- What the member had actually done when a challenge completed, so the grant
  -- can be re-derived later and explained to someone who asks why. Counts
  -- only: never a member's own words.
  progress            integer CHECK (progress IS NULL OR progress >= 0),

  -- The ledger row this produced, when it paid anything. RESTRICT for the same
  -- reason as referral_triggers: point_events is append-only, so a delete is
  -- already a mistake and should fail naming the real offence.
  point_event_id      uuid REFERENCES bloom_discord.point_events(id) ON DELETE RESTRICT,

  correlation_id      text,

  -- Join once, complete once, be paid once. The whole anti-abuse story for
  -- duplicates is this line.
  PRIMARY KEY (activity_id, user_id),

  -- The denormalised guild must be the activity's guild. Without this, a bug
  -- could file participation under a guild the activity does not belong to and
  -- every guild-scoped query would quietly disagree with the join.
  CONSTRAINT community_participants_activity_fk
    FOREIGN KEY (activity_id, guild_id)
    REFERENCES bloom_discord.community_activities (id, guild_id)
    ON DELETE CASCADE,

  -- A completion has a time. An incomplete record does not.
  CONSTRAINT community_participants_completion
    CHECK (
      (state = 'completed' AND completed_at IS NOT NULL)
      OR (state <> 'completed' AND completed_at IS NULL)
    ),

  -- Only a completion may reference a payment. This is the constraint that
  -- makes "paid but not completed" impossible to represent.
  CONSTRAINT community_participants_payment
    CHECK (point_event_id IS NULL OR state = 'completed')
);

-- "What has this member joined, and what have they completed" — the member
-- event list and the event_participation challenge metric, which is the one
-- place the two features read each other.
CREATE INDEX IF NOT EXISTS community_participants_member_idx
  ON bloom_discord.community_participants (guild_id, user_id, state, completed_at DESC);

-- Capacity counting and the staff participant list.
CREATE INDEX IF NOT EXISTS community_participants_activity_idx
  ON bloom_discord.community_participants (activity_id, state);

COMMENT ON TABLE bloom_discord.community_participants IS
  'One row per member per activity. The primary key is the anti-abuse rule: join once, complete once, pay once.';

COMMENT ON COLUMN bloom_discord.community_participants.joined_at IS
  'When this participation record began. Events set it at join; challenges have no join step and set it at completion.';
