import 'server-only';
import type { PublicTriviaQuestion } from './event-config';

/**
 * Trivia questions *with* their answers.
 *
 * `server-only` is the enforcement, not a convention: importing this from a
 * client component is a build error, so the correct answers can never end up
 * in a bundle a guest can read. Scoring happens in /api/event/play, which is
 * the only place that compares a submitted index to `answerIndex`.
 */

export type TriviaQuestion = PublicTriviaQuestion & {
  answerIndex: number;
  /** Shown after answering, right or wrong. */
  reveal: string;
};

export const TRIVIA: TriviaQuestion[] = [
  {
    id: 'q1',
    question: 'Where did Razia & Abduraziq first meet?',
    options: ['A coffee shop', 'A wedding', 'At work', 'On a hiking trail'],
    answerIndex: 0,
    reveal: 'A quaint coffee shop — bonding over artisanal coffee and bad puns. ☕',
  },
  {
    id: 'q2',
    question: 'Who said "I love you" first?',
    options: ['Razia', 'Abduraziq', 'They said it together', 'Neither will admit it'],
    answerIndex: 1,
    reveal: 'Abduraziq — after a home-cooked dinner by Razia. Straight through the stomach. 🍽️',
  },
  {
    id: 'q3',
    question: 'Their most re-watched show?',
    options: ['Friends', 'Suits', 'The Office', 'Breaking Bad'],
    answerIndex: 2,
    reveal: 'The Office. More times through than either of them will count. 🖥️',
  },
  {
    id: 'q4',
    question: "Razia's go-to coffee order?",
    options: ['Oat milk flat white', 'Double espresso', 'Cappuccino', 'Rooibos, actually'],
    answerIndex: 0,
    reveal: 'An oat milk flat white. She is *very* particular about it. 🥛',
  },
  {
    id: 'q5',
    question: 'How long did Abduraziq plan the proposal?',
    options: ['A weekend', 'A month', 'Six months', 'Nearly a year'],
    answerIndex: 3,
    reveal: 'Nearly a year of planning for one perfect moment. 💍',
  },
  {
    id: 'q6',
    question: 'Which of these has the couple genuinely argued about most?',
    options: ['The playlist', 'The guest list', 'The cake flavour', 'What time to leave'],
    answerIndex: 0,
    reveal: 'The playlist. Ask either of them tonight and watch it restart. 🎵',
  },
];

/** Client-safe view — answer index and reveal text stripped out. */
export function publicTrivia(): PublicTriviaQuestion[] {
  return TRIVIA.map(({ id, question, options }) => ({ id, question, options }));
}

export function findQuestion(id: string): TriviaQuestion | undefined {
  return TRIVIA.find(q => q.id === id);
}
