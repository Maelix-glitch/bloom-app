/**
 * Nominal typing helper.
 *
 * Discord hands us a lot of strings that look identical but mean entirely
 * different things — a user id, a role id and a channel id are all 19-digit
 * strings. Branding them means `assignRole(userId, channelId)` is a compile
 * error rather than a support ticket.
 */
declare const brandSymbol: unique symbol;

export type Brand<TBase, TBrand extends string> = TBase & {
  readonly [brandSymbol]: TBrand;
};
