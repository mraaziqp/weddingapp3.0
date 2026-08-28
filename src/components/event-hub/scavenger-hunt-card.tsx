'use client';

import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SCAVENGER_TASKS, TOTAL_SCAVENGER_POINTS } from '@/lib/event-config';

/**
 * The photo scavenger hunt.
 *
 * Tapping a quest opens the camera with that quest pre-selected, and the
 * *upload* is what completes it — the tick appears because a photo carrying
 * that tag reached Drive, not because anything on this screen was pressed.
 */

type Props = {
  /** Task tag → ISO completion time, as returned by the server. */
  completed: Record<string, string>;
  onSelectTask: (tag: string) => void;
};

export function ScavengerHuntCard({ completed, onSelectTask }: Props) {
  const doneCount = SCAVENGER_TASKS.filter(t => completed[t.tag]).length;
  const earned = SCAVENGER_TASKS.filter(t => completed[t.tag]).reduce(
    (sum, t) => sum + t.points,
    0
  );
  const allDone = doneCount === SCAVENGER_TASKS.length;

  return (
    <section className="space-y-3">
      {/* Progress */}
      <div className="rounded-2xl border border-[#d4af37]/25 bg-white/75 p-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium text-[#1C1C1C]">
            <Trophy size={15} className="text-[#d4af37]" />
            Photo Hunt
          </span>
          <span className="font-mono text-sm font-bold text-[#a07820]">
            {doneCount}/{SCAVENGER_TASKS.length}
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-black/5"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={SCAVENGER_TASKS.length}
          aria-label="Scavenger hunt progress"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #d4af37, #f6e7b7)' }}
            animate={{ width: `${(doneCount / SCAVENGER_TASKS.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <p className="mt-2 text-xs text-black/40">
          {earned} of {TOTAL_SCAVENGER_POINTS} points earned
        </p>

        {allDone && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2 text-center text-xs font-bold tracking-wide text-green-600"
          >
            🏆 Every quest done. You are a menace with that camera.
          </motion.p>
        )}
      </div>

      {/* Quests */}
      <div className="space-y-2">
        {SCAVENGER_TASKS.map((task, i) => {
          const isDone = Boolean(completed[task.tag]);
          return (
            <motion.button
              key={task.tag}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.035 }}
              onClick={() => !isDone && onSelectTask(task.tag)}
              disabled={isDone}
              whileTap={isDone ? {} : { scale: 0.98 }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition',
                isDone
                  ? 'cursor-default border-green-200 bg-green-50/70'
                  : 'border-black/5 bg-white hover:border-[#d4af37]/40 hover:bg-[#d4af37]/[0.04]'
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xl">{task.emoji}</span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium leading-snug',
                      isDone ? 'text-black/35 line-through' : 'text-[#1C1C1C]'
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-black/35">
                    {isDone ? 'Done — nice one.' : task.hint}
                  </p>
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <CheckCircle2 size={20} className="text-green-500" />
                  </motion.span>
                ) : (
                  <Camera size={18} className="text-[#d4af37]/70" />
                )}
                <span className="font-mono text-[10px] text-black/30">+{task.points}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
