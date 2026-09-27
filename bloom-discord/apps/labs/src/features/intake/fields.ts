import type { BloomModalField } from '@bloom/embeds';

/**
 * The modal forms, and the one place their limits are written down.
 *
 * Every `maxLength` here has a matching CHECK in `0008_labs.sql`. They are kept
 * equal on purpose: a form that accepts 300 characters into a column that
 * accepts 200 turns a member's careful paragraph into a database error after
 * they pressed submit, with the text gone. Discord enforces these client-side,
 * so the member is stopped while they can still edit.
 *
 * The minimums matter as much. An eight-character floor on a summary is not
 * bureaucracy — "it broke" is a report nobody can action, and the field is the
 * right place to say so rather than a reply afterwards.
 */

export const SUMMARY_MIN = 8;
export const SUMMARY_MAX = 200;
export const STEPS_MIN = 8;
export const STEPS_MAX = 2000;
export const DETAIL_MAX = 2000;
export const EXPECTED_MAX = 1000;

export const FEEDBACK_SUMMARY_FIELD = 'summary';
export const FEEDBACK_DETAIL_FIELD = 'detail';
export const BUG_SUMMARY_FIELD = 'summary';
export const BUG_STEPS_FIELD = 'steps';
export const BUG_EXPECTED_FIELD = 'expected';

export const FEEDBACK_FIELDS: readonly BloomModalField[] = [
  {
    customId: FEEDBACK_SUMMARY_FIELD,
    label: 'In one sentence',
    style: 'short',
    required: true,
    minLength: SUMMARY_MIN,
    maxLength: SUMMARY_MAX,
    placeholder: 'The check-in reminder arrives too late to be useful',
  },
  {
    customId: FEEDBACK_DETAIL_FIELD,
    label: 'Anything else (optional)',
    style: 'paragraph',
    required: false,
    maxLength: DETAIL_MAX,
    placeholder: 'What you were trying to do, and what would be better.',
  },
];

export const BUG_FIELDS: readonly BloomModalField[] = [
  {
    customId: BUG_SUMMARY_FIELD,
    label: 'What went wrong, in one sentence',
    style: 'short',
    required: true,
    minLength: SUMMARY_MIN,
    maxLength: SUMMARY_MAX,
    placeholder: 'Saving a check-in shows an error and loses the note',
  },
  {
    customId: BUG_STEPS_FIELD,
    label: 'How to make it happen',
    style: 'paragraph',
    required: true,
    minLength: STEPS_MIN,
    maxLength: STEPS_MAX,
    placeholder: '1. Open the app\n2. Tap Check in\n3. Type anything and save',
  },
  {
    customId: BUG_EXPECTED_FIELD,
    label: 'What you expected instead (optional)',
    style: 'paragraph',
    required: false,
    maxLength: EXPECTED_MAX,
    placeholder: 'Leave blank if it is obvious from the steps.',
  },
];
