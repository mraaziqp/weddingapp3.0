/**
 * Content for the entertainment evening — the client-safe half.
 *
 * Deliberately a plain module rather than Firestore documents: the quests and
 * trivia are fixed for one night, so reading them from code means the hub's
 * first paint needs no round trip and cannot be broken by a database hiccup
 * during the party.
 *
 * Trivia *answers* live in `event-trivia-server.ts`, which is `server-only`.
 * Keeping them out of this module is what stops the correct answers from being
 * shipped in the browser bundle, where any guest could read them out of the
 * JavaScript and win the leaderboard without playing.
 */

export type ScavengerTask = {
  tag: string;
  emoji: string;
  title: string;
  /** Shown under the title as a nudge on how to shoot it. */
  hint: string;
  points: number;
};

/**
 * The photo hunt. `tag` is written onto the Drive file's appProperties at
 * upload time, and that upload is what completes the task — there is no
 * separate "mark complete" call a guest could fire without a real photo.
 */
export const SCAVENGER_TASKS: ScavengerTask[] = [
  {
    tag: 'host-selfie',
    emoji: '🤳',
    title: 'Selfie with the host',
    hint: 'Track them down — they are the one running around.',
    points: 10,
  },
  {
    tag: 'groom-laughing',
    emoji: '😂',
    title: 'Snap the groom laughing',
    hint: 'A real laugh, not a polite one.',
    points: 15,
  },
  {
    tag: 'best-dance-move',
    emoji: '🕺',
    title: 'Best dance move of the night',
    hint: 'Mid-air is a bonus.',
    points: 15,
  },
  {
    tag: 'squad-shot',
    emoji: '🫂',
    title: 'Your whole table in one frame',
    hint: 'Nobody gets to hide behind the person in front.',
    points: 10,
  },
  {
    tag: 'stranger-to-friend',
    emoji: '👋',
    title: 'Someone you met tonight',
    hint: 'Get their name before you take the photo.',
    points: 15,
  },
  {
    tag: 'dessert-crime',
    emoji: '🍰',
    title: 'Caught at the dessert table',
    hint: 'Second helpings count double. Morally.',
    points: 10,
  },
  {
    tag: 'best-outfit',
    emoji: '✨',
    title: 'The outfit of the evening',
    hint: 'Ask first, then make them pose.',
    points: 10,
  },
  {
    tag: 'quiet-moment',
    emoji: '🕯️',
    title: 'A quiet moment in a loud room',
    hint: 'The photo nobody notices you taking.',
    points: 20,
  },
];

export const TOTAL_SCAVENGER_POINTS = SCAVENGER_TASKS.reduce((sum, t) => sum + t.points, 0);

export function findTask(tag: string): ScavengerTask | undefined {
  return SCAVENGER_TASKS.find(t => t.tag === tag);
}

/** A trivia question as the browser sees it — question and options, no answer. */
export type PublicTriviaQuestion = {
  id: string;
  question: string;
  options: string[];
};

export const TRIVIA_POINTS_PER_CORRECT = 10;

/** Emoji a guest can react with on the memory wall. */
export const REACTIONS = ['❤️', '😂', '🔥', '🥹', '🎉'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export function isReaction(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && (REACTIONS as readonly string[]).includes(value);
}
