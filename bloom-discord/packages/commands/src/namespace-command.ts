import { bloomError, type BotName } from '@bloom/shared-types';
import type {
  AuthorizationContext,
  AuthorizationPolicy,
  DiscordPermissionName,
} from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import type { BloomCommand } from './command.js';
import type { CommandInvocation } from './invocation.js';
import type { SubcommandGroupSpec, SubcommandSpec } from './spec.js';

/**
 * Composing one namespaced command out of many features.
 *
 * `/guardian` is a single Discord command with a tree of subcommands, but its
 * branches belong to different features — onboarding owns
 * `/guardian onboarding …`, moderation owns `/guardian case …`. Writing that as
 * one handler with a growing `if (group === … && sub === …)` chain produces
 * exactly the two things the brief rules out: a giant file, and a giant switch.
 *
 * So features contribute {@link SubcommandContribution} values, and this
 * assembles them into one {@link BloomCommand}:
 *
 *   • The spec is derived from the contributions, so a subcommand cannot be
 *     published to Discord without a handler or handled without being
 *     published. There is no second list to keep in sync.
 *   • Routing is a `Map` lookup on `group/name`, not a conditional chain.
 *   • Duplicate paths throw at construction — at boot, in every environment,
 *     rather than the first time somebody runs the shadowed one.
 */

export interface SubcommandContribution<TDeps> {
  /** Subcommand group, e.g. `case`. Omit for a bare subcommand like `overview`. */
  readonly group?: string;
  readonly spec: SubcommandSpec;
  /**
   * An additional requirement, checked after the namespace policy.
   *
   * Strictly narrowing: the namespace policy always runs first and this cannot
   * widen it, so a subcommand can demand Administrator inside a moderator-gated
   * namespace but cannot open a branch to everyone. That direction is the whole
   * safety property — inheritance stays the default, and the exception has to
   * be written down.
   *
   * Discord cannot express per-subcommand permissions, so this has no client
   * side counterpart: the branch is visible to anyone who can see the parent
   * and refuses when invoked. That is the same trust model as every other
   * policy here, where `defaultMemberPermissions` is a hint and the server-side
   * check is the boundary.
   */
  readonly policy?: AuthorizationPolicy;
  /**
   * Set `false` on a branch that shows a modal.
   *
   * Discord accepts a modal only as the initial response to an interaction, so
   * deferring first makes it impossible. Defaults to the namespace's own
   * setting, which is to defer — the safe choice for anything that reads the
   * database.
   */
  readonly defer?: false;
  /**
   * Returns a message, or responds itself and returns nothing.
   *
   * `authContext` is the context both the namespace policy and this branch's
   * policy were evaluated against, so a handler can ask a further question
   * about the caller — "is this a moderator?" — without re-deriving it and
   * risking a different answer.
   */
  execute(
    invocation: CommandInvocation,
    deps: TDeps,
    authContext: AuthorizationContext,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<BloomMessage | void>;
}

export interface NamespaceCommandOptions<TDeps> {
  readonly bot: BotName;
  readonly name: string;
  readonly description: string;
  readonly policy: AuthorizationPolicy;
  readonly contributions: readonly SubcommandContribution<TDeps>[];
  /**
   * Descriptions for the groups used by contributions.
   *
   * Required for every group referenced: Discord needs a description per group,
   * and defaulting it to the group name produces a command list that reads like
   * a database dump.
   */
  readonly groupDescriptions?: Readonly<Record<string, string>>;
  readonly defaultMemberPermissions?: readonly DiscordPermissionName[] | 'none';
  readonly defer?: boolean;
  readonly ephemeral?: boolean;
}

const pathOf = (group: string | undefined, name: string): string =>
  group === undefined ? name : `${group}/${name}`;

export function namespaceCommand<TDeps>(
  options: NamespaceCommandOptions<TDeps>,
): BloomCommand<TDeps> {
  const routes = new Map<string, SubcommandContribution<TDeps>>();
  const bare: SubcommandSpec[] = [];
  const grouped = new Map<string, SubcommandSpec[]>();

  for (const contribution of options.contributions) {
    const path = pathOf(contribution.group, contribution.spec.name);

    if (routes.has(path)) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint:
          `Two features both contribute "/${options.name} ${path.replace('/', ' ')}". ` +
          'Subcommand paths must be unique — one of them would be unreachable, and which one depends on registration order.',
        details: { command: options.name, path },
      });
    }
    routes.set(path, contribution);
    if (contribution.group === undefined) {
      bare.push(contribution.spec);
    } else {
      const list = grouped.get(contribution.group) ?? [];
      list.push(contribution.spec);
      grouped.set(contribution.group, list);
    }
  }

  /*
   * Discord's own limits, checked here rather than discovered at registration.
   * A 400 from the API during deploy is a much worse place to learn this.
   */
  for (const [group, subcommands] of grouped) {
    if (subcommands.length > 25) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Group "${group}" has ${String(subcommands.length)} subcommands. Discord allows 25.`,
        details: { group, count: subcommands.length },
      });
    }
  }

  const groups: SubcommandGroupSpec[] = [...grouped.entries()].map(
    ([name, subcommands]) => {
      const description = options.groupDescriptions?.[name];
      if (!description) {
        throw bloomError('CONFIGURATION_ERROR', {
          operatorHint: `Subcommand group "${name}" has no description. Add it to groupDescriptions on the "${options.name}" command.`,
          details: { group: name },
        });
      }
      return { name, description, subcommands };
    },
  );

  return {
    bot: options.bot,
    policy: options.policy,
    /*
     * Resolved per invocation by routing first. A branch that opens a modal
     * declares `defer: false`, and the alternative — making the whole namespace
     * non-deferring — would put every database-backed branch back inside the
     * three-second budget.
     */
    defer: (invocation): boolean => {
      const group = invocation.options.getSubcommandGroup() ?? undefined;
      const name = invocation.options.getSubcommand();
      if (name === null) return options.defer ?? true;
      const route = routes.get(pathOf(group, name));
      if (route?.defer === false) return false;
      return options.defer ?? true;
    },
    ephemeral: options.ephemeral ?? true,
    spec: {
      name: options.name,
      description: options.description,
      guildOnly: true,
      ...(options.defaultMemberPermissions === undefined
        ? {}
        : { defaultMemberPermissions: options.defaultMemberPermissions }),
      ...(bare.length > 0 ? { subcommands: bare } : {}),
      ...(groups.length > 0 ? { groups } : {}),
    },

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    async execute(invocation, deps, authContext): Promise<BloomMessage | void> {
      const group = invocation.options.getSubcommandGroup() ?? undefined;
      const name = invocation.options.getSubcommand();

      if (name === null) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: `"/${options.name}" was invoked with no subcommand. Discord should not allow this for a command that only has subcommands.`,
        });
      }

      const route = routes.get(pathOf(group, name));
      if (!route) {
        throw bloomError('NOT_IMPLEMENTED', {
          operatorHint:
            `No handler for "/${options.name} ${pathOf(group, name).replace('/', ' ')}". ` +
            'The command spec and the handler table are built from the same contributions, so this means a stale command registration in the guild — re-run the registrar.',
          details: { command: options.name, group: group ?? null, subcommand: name },
        });
      }

      /*
       * The branch's own requirement, on top of the namespace policy the
       * dispatcher has already enforced. Evaluated against the same context, so
       * the two checks cannot disagree about who the caller is.
       */
      if (route.policy) {
        const authorised = route.policy({
          ...authContext,
          command: invocation.commandPath,
        });
        if (!authorised.ok) throw authorised.error;
      }

      return await route.execute(invocation, deps, {
        ...authContext,
        command: invocation.commandPath,
      });
    },
  };
}
