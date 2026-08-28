import 'server-only';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { toIso } from './firestore-server';
import {
  SCAVENGER_TASKS,
  TRIVIA_POINTS_PER_CORRECT,
  findTask,
  type ReactionEmoji,
} from './event-config';

/**
 * Firestore state for the entertainment evening.
 * ─────────────────────────────────────────────
 * Kept apart from `firestore-server.ts` so the wedding data layer stays the
 * wedding's — nothing here is reachable from the wedding's `/api/data`
 * allowlist, and nothing here can widen it.
 *
 * Photos are *not* stored here. Drive remains the media database (see
 * `google-drive.ts`); these collections hold only what Drive cannot answer
 * cheaply: written notes, per-item reaction counts, and the scoreboard.
 *
 * Field names stay snake_case to match the rest of the app's documents.
 */

const COLLECTIONS = {
  notes: 'event_notes',
  reactions: 'event_reactions',
  progress: 'event_progress',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// ── Memory notes ──────────────────────────────────────────────────────────

export type EventNote = {
  id: string;
  guestId: string;
  guestName: string;
  message: string;
  createdAt: string | null;
  hidden: boolean;
};

function toNote(id: string, row: DbRow): EventNote {
  return {
    id,
    guestId: row.guest_id ?? '',
    guestName: row.guest_name ?? 'A guest',
    message: row.message ?? '',
    createdAt: toIso(row.created_at),
    hidden: row.hidden === true,
  };
}

export async function addEventNote(input: {
  guestId: string;
  guestName: string;
  message: string;
}): Promise<EventNote> {
  const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // A real client timestamp rather than serverTimestamp(), for the same reason
  // as the well-wishes wall: serverTimestamp() resolves to null on the write,
  // which would leave a guest's own note sorting last until they refetched.
  const createdAt = new Date();

  await adminDb()
    .collection(COLLECTIONS.notes)
    .doc(id)
    .set({
      guest_id: input.guestId,
      guest_name: input.guestName,
      message: input.message,
      created_at: Timestamp.fromDate(createdAt),
      hidden: false,
    });

  return {
    id,
    guestId: input.guestId,
    guestName: input.guestName,
    message: input.message,
    createdAt: createdAt.toISOString(),
    hidden: false,
  };
}

export async function fetchEventNotes(max = 100, includeHidden = false): Promise<EventNote[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.notes)
    .orderBy('created_at', 'desc')
    .limit(max)
    .get();

  const notes = snap.docs.map(d => toNote(d.id, d.data()));
  return includeHidden ? notes : notes.filter(n => !n.hidden);
}

export async function setEventNoteHidden(id: string, hidden: boolean): Promise<void> {
  await adminDb().collection(COLLECTIONS.notes).doc(id).update({ hidden });
}

// ── Reactions ─────────────────────────────────────────────────────────────

/**
 * One document per (guest, item) pair, with the document id encoding both.
 *
 * That shape makes a guest's reaction idempotent: tapping ❤️ twice overwrites
 * one document instead of appending a second, so a guest cannot inflate a
 * count by hammering the button — which, on a leaderboard night, someone will
 * absolutely try.
 */
function reactionDocId(targetId: string, guestId: string): string {
  return `${targetId}__${guestId}`;
}

export type ReactionCounts = Record<string, Partial<Record<string, number>>>;

export async function setReaction(input: {
  targetId: string;
  guestId: string;
  emoji: ReactionEmoji | null;
}): Promise<void> {
  const ref = adminDb()
    .collection(COLLECTIONS.reactions)
    .doc(reactionDocId(input.targetId, input.guestId));

  // A null emoji means "un-react" — the guest tapped the same one again.
  if (input.emoji === null) {
    await ref.delete();
    return;
  }

  await ref.set({
    target_id: input.targetId,
    guest_id: input.guestId,
    emoji: input.emoji,
    created_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Reaction totals for every item, plus what this guest personally reacted with.
 *
 * Reads the whole collection and aggregates in memory rather than running a
 * count query per photo. One evening's reactions are a few thousand documents
 * at the very most, and the alternative is N queries on every feed poll from
 * every phone in the room.
 */
export async function fetchReactions(guestId: string): Promise<{
  counts: ReactionCounts;
  mine: Record<string, string>;
}> {
  const snap = await adminDb().collection(COLLECTIONS.reactions).get();

  const counts: ReactionCounts = {};
  const mine: Record<string, string> = {};

  for (const doc of snap.docs) {
    const row = doc.data();
    const target = row.target_id as string;
    const emoji = row.emoji as string;
    if (!target || !emoji) continue;

    const bucket = (counts[target] ??= {});
    bucket[emoji] = (bucket[emoji] ?? 0) + 1;

    if (row.guest_id === guestId) mine[target] = emoji;
  }

  return { counts, mine };
}

// ── Progress & leaderboard ────────────────────────────────────────────────

export type EventProgress = {
  guestId: string;
  guestName: string;
  /** Scavenger task tag → ISO time it was completed. */
  tasks: Record<string, string>;
  /** Trivia question id → whether they got it right. */
  trivia: Record<string, boolean>;
  points: number;
};

function toProgress(id: string, row: DbRow): EventProgress {
  return {
    guestId: id,
    guestName: row.guest_name ?? 'A guest',
    tasks: row.tasks ?? {},
    trivia: row.trivia ?? {},
    points: row.points ?? 0,
  };
}

/**
 * Recomputes the score from the stored task and trivia maps.
 *
 * Always derived, never incremented. An incremented counter drifts the moment
 * a write is retried — and the upload path *does* retry — which on a
 * leaderboard is the difference between a game and an argument.
 */
function scoreOf(tasks: Record<string, string>, trivia: Record<string, boolean>): number {
  const taskPoints = Object.keys(tasks).reduce(
    (sum, tag) => sum + (findTask(tag)?.points ?? 0),
    0
  );
  const triviaPoints =
    Object.values(trivia).filter(Boolean).length * TRIVIA_POINTS_PER_CORRECT;
  return taskPoints + triviaPoints;
}

export async function fetchProgress(guestId: string): Promise<EventProgress> {
  const snap = await adminDb().collection(COLLECTIONS.progress).doc(guestId).get();
  if (!snap.exists) {
    return { guestId, guestName: 'A guest', tasks: {}, trivia: {}, points: 0 };
  }
  return toProgress(guestId, snap.data()!);
}

/**
 * Credits a scavenger task, keyed off a real upload.
 *
 * Runs in a transaction because a guest firing two uploads at once would
 * otherwise have both read the same pre-write document and the second
 * overwrite the first, silently dropping a completed task.
 */
export async function completeTask(input: {
  guestId: string;
  guestName: string;
  tag: string;
}): Promise<EventProgress> {
  if (!findTask(input.tag)) {
    // An unknown tag scores nothing — the tag arrives from the client, and a
    // made-up one must not be able to mint points.
    return fetchProgress(input.guestId);
  }

  const ref = adminDb().collection(COLLECTIONS.progress).doc(input.guestId);

  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = snap.exists
      ? toProgress(input.guestId, snap.data()!)
      : { guestId: input.guestId, guestName: input.guestName, tasks: {}, trivia: {}, points: 0 };

    // First completion wins — re-shooting a task must not re-award it.
    const tasks = { ...current.tasks };
    if (!tasks[input.tag]) tasks[input.tag] = new Date().toISOString();

    const points = scoreOf(tasks, current.trivia);

    tx.set(
      ref,
      {
        guest_name: input.guestName,
        tasks,
        trivia: current.trivia,
        points,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ...current, guestName: input.guestName, tasks, points };
  });
}

/** Records one trivia answer. Same transaction reasoning as `completeTask`. */
export async function recordTriviaAnswer(input: {
  guestId: string;
  guestName: string;
  questionId: string;
  correct: boolean;
}): Promise<EventProgress> {
  const ref = adminDb().collection(COLLECTIONS.progress).doc(input.guestId);

  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = snap.exists
      ? toProgress(input.guestId, snap.data()!)
      : { guestId: input.guestId, guestName: input.guestName, tasks: {}, trivia: {}, points: 0 };

    // Answers are final. Without this, a wrong answer could be retried until
    // it was right, and every score would converge on full marks.
    if (input.questionId in current.trivia) return current;

    const trivia = { ...current.trivia, [input.questionId]: input.correct };
    const points = scoreOf(current.tasks, trivia);

    tx.set(
      ref,
      {
        guest_name: input.guestName,
        tasks: current.tasks,
        trivia,
        points,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ...current, guestName: input.guestName, trivia, points };
  });
}

export type LeaderboardRow = {
  guestId: string;
  guestName: string;
  points: number;
  tasksDone: number;
};

export async function fetchLeaderboard(max = 15): Promise<LeaderboardRow[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.progress)
    .orderBy('points', 'desc')
    .limit(max)
    .get();

  return snap.docs.map(d => {
    const p = toProgress(d.id, d.data());
    return {
      guestId: p.guestId,
      guestName: p.guestName,
      points: p.points,
      tasksDone: Object.keys(p.tasks).length,
    };
  });
}

/** Total tasks available — used to render "3 of 8" without a second import. */
export const TASK_COUNT = SCAVENGER_TASKS.length;
