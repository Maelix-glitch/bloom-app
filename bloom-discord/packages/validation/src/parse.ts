import { type z } from 'zod';
import { bloomError, err, ok, type BloomError, type Result } from '@bloom/shared-types';

/**
 * Parse untrusted input into a `Result`.
 *
 * Zod's `safeParse` already avoids throwing; this adapts its error into the
 * platform's single error type and, importantly, into a message that is safe to
 * show a member. Zod's raw issue text ("Invalid input: expected string,
 * received undefined at path root.target_id") is precise and completely
 * unsuitable for a Discord reply.
 */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  options: { readonly userMessage?: string } = {},
): Result<z.output<TSchema>, BloomError> {
  const result = schema.safeParse(input);
  if (result.success) return ok(result.data);

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  }));

  // The first issue's message is author-written in our schemas, so it is
  // already phrased for a human. Fall back to something neutral if not.
  const firstMessage = issues[0]?.message;

  return err(
    bloomError('INVALID_INPUT', {
      userMessage:
        options.userMessage ??
        firstMessage ??
        'That input was not valid. Please check it and try again.',
      operatorHint: `Input validation failed: ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
      details: { issues },
    }),
  );
}

/**
 * Parse or throw. For boot-time configuration, where a bad value must stop the
 * process rather than produce a degraded bot.
 */
export function parseOrThrow<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  context: string,
): z.output<TSchema> {
  const result = parseInput(schema, input);
  if (result.ok) return result.value;
  throw bloomError('CONFIGURATION_ERROR', {
    operatorHint: `${context}: ${result.error.operatorHint}`,
    details: result.error.details,
    cause: result.error,
  });
}
