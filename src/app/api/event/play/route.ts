import { NextRequest, NextResponse } from 'next/server';
import { getEventSession } from '@/lib/event-access';
import { fetchLeaderboard, fetchProgress, recordTriviaAnswer } from '@/lib/event-store';
import { publicTrivia, findQuestion } from '@/lib/event-trivia-server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/**
 * The gamification endpoint — quest progress, trivia and the leaderboard.
 *
 *   GET   → this guest's progress, the questions (without answers), the board
 *   POST  → submit one trivia answer, scored here
 *
 * Scoring is server-side because the answer key lives in `event-trivia-server`
 * (a `server-only` module) and never reaches the browser. Marking answers on
 * the client would ship the answers with them.
 *
 * Scavenger tasks are deliberately *not* completable here — they are credited
 * by /api/event/upload when a real photo lands, so there is no endpoint that
 * awards a task without one.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  try {
    const [progress, leaderboard] = await Promise.all([
      fetchProgress(session.sub),
      fetchLeaderboard(15),
    ]);

    return NextResponse.json({
      progress,
      leaderboard,
      questions: publicTrivia(),
    });
  } catch (err) {
    console.error('[Event] play GET failed:', err);
    return NextResponse.json({ error: 'Could not load the games' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getEventSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Join the event first' }, { status: 401 });
  }

  const limit = rateLimit(`event-play:${session.sub}:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'One at a time!' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: { questionId?: unknown; answerIndex?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  const question = findQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: 'Unknown question' }, { status: 400 });
  }

  const answerIndex = Number(body.answerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
    return NextResponse.json({ error: 'Pick an answer' }, { status: 400 });
  }

  const correct = answerIndex === question.answerIndex;

  try {
    const progress = await recordTriviaAnswer({
      guestId: session.sub,
      guestName: session.name,
      questionId,
      correct,
    });

    // The first answer is the one that counts, so report what was *recorded*
    // rather than what was just submitted. Otherwise resubmitting a question
    // until the response says "Correct!" would show a guest the answer key —
    // scoring nothing, but taking the game with it.
    const recorded = progress.trivia[questionId] ?? correct;

    return NextResponse.json({
      ok: true,
      correct: recorded,
      // Returned only once the guest has committed to an answer, so the
      // response cannot be used to read the key ahead of playing.
      answerIndex: question.answerIndex,
      reveal: question.reveal,
      progress,
    });
  } catch (err) {
    console.error('[Event] play POST failed:', err);
    return NextResponse.json({ error: 'Could not save your answer' }, { status: 502 });
  }
}
