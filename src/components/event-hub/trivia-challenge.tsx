'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, Medal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { answerTrivia, type EventProgress, type LeaderboardRow } from '@/lib/event-client';
import type { PublicTriviaQuestion } from '@/lib/event-config';

/**
 * Couple trivia with instant feedback.
 *
 * The answer key is never in this bundle — a tap posts to /api/event/play,
 * which marks it server-side and returns both the verdict and the correct
 * index. That round trip is the point: with the key on the client, reading the
 * leaderboard's top score would only take opening devtools.
 */

type Props = {
  questions: PublicTriviaQuestion[];
  progress: EventProgress;
  leaderboard: LeaderboardRow[];
  myGuestId: string;
  onAnswered: (progress: EventProgress) => void;
};

type Feedback = {
  correct: boolean;
  answerIndex: number;
  reveal: string;
  picked: number;
};

export function TriviaChallenge({
  questions,
  progress,
  leaderboard,
  myGuestId,
  onAnswered,
}: Props) {
  const [index, setIndex] = useState(() =>
    // Resume where they left off rather than making them tap past questions
    // they already answered.
    Math.max(
      0,
      questions.findIndex(q => !(q.id in progress.trivia))
    )
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  const question = questions[index];
  const answeredCount = useMemo(
    () => questions.filter(q => q.id in progress.trivia).length,
    [questions, progress.trivia]
  );
  const allAnswered = answeredCount === questions.length;

  const handleAnswer = useCallback(
    async (choice: number) => {
      if (!question || busy || feedback) return;
      setBusy(true);
      try {
        const result = await answerTrivia(question.id, choice);
        setFeedback({
          correct: result.correct,
          answerIndex: result.answerIndex,
          reveal: result.reveal,
          picked: choice,
        });
        onAnswered(result.progress);
      } catch {
        // Silent: the guest can simply tap again. An error banner in the
        // middle of a game is more disruptive than a tap that did nothing.
      } finally {
        setBusy(false);
      }
    },
    [question, busy, feedback, onAnswered]
  );

  const next = useCallback(() => {
    setFeedback(null);
    setIndex(i => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white/75 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-headline text-xl italic text-[#d4af37]">Couple Trivia</h3>
          <span className="font-mono text-xs text-black/35">
            {answeredCount}/{questions.length}
          </span>
        </div>

        {allAnswered && !feedback ? (
          <div className="py-6 text-center">
            <Sparkles className="mx-auto mb-2 text-[#d4af37]" size={26} />
            <p className="font-headline text-lg italic text-[#1C1C1C]">
              You have answered them all.
            </p>
            <p className="mt-1 text-sm text-black/40">
              {Object.values(progress.trivia).filter(Boolean).length} correct out of{' '}
              {questions.length}.
            </p>
          </div>
        ) : question ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.24 }}
            >
              <p className="mb-4 font-headline text-lg italic leading-snug text-[#1C1C1C]">
                {question.question}
              </p>

              <div className="space-y-2">
                {question.options.map((option, i) => {
                  const isRight = feedback && i === feedback.answerIndex;
                  const isWrongPick = feedback && i === feedback.picked && !feedback.correct;

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(i)}
                      disabled={Boolean(feedback) || busy}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition',
                        isRight && 'border-green-400 bg-green-50 text-green-800',
                        isWrongPick && 'border-red-300 bg-red-50 text-red-700',
                        !feedback &&
                          'border-black/8 bg-white text-[#1C1C1C] hover:border-[#d4af37]/45 active:scale-[0.99]',
                        feedback && !isRight && !isWrongPick && 'border-black/5 opacity-45'
                      )}
                    >
                      <span>{option}</span>
                      {isRight && <Check size={16} className="flex-shrink-0" />}
                      {isWrongPick && <X size={16} className="flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl bg-black/[0.03] px-4 py-3">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          feedback.correct ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {feedback.correct ? 'Correct! +10 points' : 'Not quite.'}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-black/55">
                        {feedback.reveal}
                      </p>
                    </div>

                    {index < questions.length - 1 && (
                      <button
                        onClick={next}
                        className="mt-3 w-full rounded-full py-2.5 text-sm font-bold text-black/80"
                        style={{
                          background:
                            'linear-gradient(135deg, #f6e7b7 0%, #d4af37 60%, #b8992d 100%)',
                        }}
                      >
                        Next question
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <Leaderboard rows={leaderboard} myGuestId={myGuestId} />
    </section>
  );
}

function Leaderboard({ rows, myGuestId }: { rows: LeaderboardRow[]; myGuestId: string }) {
  if (rows.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-2xl border border-black/5 bg-white/75 p-4 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 font-headline text-xl italic text-[#d4af37]">
        <Medal size={17} />
        Leaderboard
      </h3>

      <ol className="space-y-1">
        {rows.map((row, i) => {
          const isMe = row.guestId === myGuestId;
          return (
            <li
              key={row.guestId}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm',
                isMe ? 'bg-[#d4af37]/12 font-medium' : 'odd:bg-black/[0.02]'
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="w-5 flex-shrink-0 text-center text-xs">
                  {medals[i] ?? i + 1}
                </span>
                <span className="truncate text-[#1C1C1C]">
                  {row.guestName}
                  {isMe && <span className="ml-1 text-[10px] text-[#a07820]">(you)</span>}
                </span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[10px] text-black/30">{row.tasksDone} quests</span>
                <span className="font-mono font-bold text-[#a07820]">{row.points}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
