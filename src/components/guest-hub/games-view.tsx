
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle, Camera, Trophy, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GamesViewProps {
    onSelectQuest: (questTag: string) => void;
    completedQuests: string[];
}

const quests = [
    { tag: 'best-dance-move', emoji: '💃', title: 'Catch the best dance move on the floor' },
    { tag: 'new-friend-selfie', emoji: '🤳', title: 'A selfie with someone you just met tonight' },
    { tag: 'sweetest-couple-moment', emoji: '💕', title: 'The sweetest couple moment (not R&A!)' },
    { tag: 'cake-shot', emoji: '🎂', title: 'An epic shot of the wedding cake' },
    { tag: 'group-cheers', emoji: '🥂', title: 'The whole table raising their glasses' },
    { tag: 'best-dressed-guest', emoji: '👗', title: 'The best dressed guest at the party' },
    { tag: 'emotional-moment', emoji: '🥹', title: 'Someone with happy tears in their eyes' },
    { tag: 'flower-detail', emoji: '🌸', title: 'A beautiful floral arrangement close-up' },
    { tag: 'kids-having-fun', emoji: '🧒', title: 'Kids being absolutely adorable' },
    { tag: 'sneaky-couple', emoji: '🤫', title: 'R&A when they think no one is watching' },
];

const trivia = [
    {
        question: "Where did Razia & Abduraziq first meet?",
        answer: "At a quaint coffee shop, bonding over a shared love for artisanal coffee and bad puns. ☕"
    },
    {
        question: "Who said 'I love you' first?",
        answer: "Abduraziq, after a memorable home-cooked dinner by Razia. The way to his heart is through his stomach! 🍽️"
    },
    {
        question: "What is their shared favourite binge-worthy TV show?",
        answer: "The Office. They've watched it through more times than they can count. 🖥️"
    },
    {
        question: "What is Razia's go-to order at their favourite coffee shop?",
        answer: "An oat milk flat white — she's very particular about it! 🥛"
    },
    {
        question: "How long did Abduraziq wait before proposing?",
        answer: "He planned the perfect moment for nearly a year — worth every second. 💍"
    },
    {
        question: "What song was playing when they had their first dance?",
        answer: "That's a secret only they know… ask them tonight! 🎵"
    },
];

const TriviaCard = ({ question, answer, onNext, index }: { question: string; answer: string; onNext: () => void; index: number }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        if (isFlipped) return;
        setIsFlipped(true);
        setTimeout(() => {
            onNext();
            setIsFlipped(false);
        }, 3000);
    };

    return (
        <div className="w-full h-52 [perspective:1000px] cursor-pointer" onClick={handleFlip}>
            <motion.div
                className="relative w-full h-full [transform-style:preserve-3d]"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            >
                {/* Front */}
                <div className="absolute w-full h-full [backface-visibility:hidden] rounded-2xl p-6 flex flex-col justify-between text-black shadow-xl overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, #f6e7b7 0%, #d4af37 60%, #b8992d 100%)`,
                        boxShadow: '0 8px 32px rgba(212,175,55,0.35)',
                    }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/50">Q{index + 1} of {trivia.length}</span>
                        <Sparkles size={16} className="text-black/30" />
                    </div>
                    <p className="font-headline text-xl italic font-bold text-center leading-snug">{question}</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-0.5 bg-black/20 rounded" />
                        <p className="text-[10px] text-black/50 font-medium uppercase tracking-widest">Tap to reveal</p>
                        <div className="w-8 h-0.5 bg-black/20 rounded" />
                    </div>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#1C1C1C] text-white rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-xl"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    <p className="font-headline italic text-[#d4af37] text-xl mb-3">Answer</p>
                    <p className="text-base leading-relaxed">{answer}</p>
                </div>
            </motion.div>
        </div>
    );
};

export function GamesView({ onSelectQuest, completedQuests }: GamesViewProps) {
    const [activeTriviaIndex, setActiveTriviaIndex] = useState(0);

    const handleNextTrivia = () => {
        setActiveTriviaIndex(prev => (prev + 1) % trivia.length);
    };

    const completedCount = completedQuests.length;
    const allDone = completedCount >= quests.length;

    return (
        <div className="p-4 space-y-6 pb-8">
            {/* Header */}
            <header className="text-center pt-2">
                <h1 className="font-headline text-3xl font-bold italic text-[#1C1C1C]">
                    Let&apos;s Play 🎉
                </h1>
                <p className="text-gray-500 tracking-wide mt-1 text-sm">Join the fun and capture some memories.</p>
            </header>

            {/* Progress bar */}
            <div className="glass-card !bg-white/70 !border-[#d4af37]/20 !p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1C1C1C] flex items-center gap-2">
                        <Trophy size={16} className="text-[#d4af37]" />
                        Scavenger Progress
                    </span>
                    <span className="font-mono font-bold text-[#d4af37]">{completedCount}/{quests.length}</span>
                </div>
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #d4af37, #f6e7b7)' }}
                        animate={{ width: `${(completedCount / quests.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
                {allDone && (
                    <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-xs text-green-600 font-bold tracking-wide pt-1"
                    >
                        🏆 Hunt complete! You&apos;re a legend.
                    </motion.p>
                )}
            </div>

            {/* Photo Scavenger Hunt */}
            <Card className="bg-white/60 backdrop-blur-md border-black/10 shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="font-headline text-2xl italic text-[#d4af37]">📸 Photo Hunt</CardTitle>
                    <p className="text-xs text-gray-500">Tap a challenge → snap it → earn it!</p>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4">
                    {quests.map((quest, i) => {
                        const isCompleted = completedQuests.includes(quest.tag);
                        return (
                            <motion.button
                                key={quest.tag}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                onClick={() => !isCompleted && onSelectQuest(quest.tag)}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border",
                                    isCompleted
                                        ? "bg-green-50 border-green-200 text-gray-400 cursor-default"
                                        : "bg-white border-black/5 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/5 active:scale-[0.98]"
                                )}
                                whileTap={isCompleted ? {} : { scale: 0.97 }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl flex-shrink-0">{quest.emoji}</span>
                                    <span className={cn("font-medium text-sm leading-snug", isCompleted && "line-through text-gray-400")}>{quest.title}</span>
                                </div>
                                <AnimatePresence mode="wait">
                                    {isCompleted ? (
                                        <motion.div key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                                            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="arrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <Camera size={18} className="text-[#d4af37]/60 flex-shrink-0" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Couple's Trivia */}
            <Card className="bg-white/60 backdrop-blur-md border-black/10 shadow-lg overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="font-headline text-2xl italic text-[#d4af37]">💛 Couple&apos;s Trivia</CardTitle>
                    <p className="text-xs text-gray-500">How well do you know R&amp;A? Flip the card to find out!</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTriviaIndex}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.28 }}
                        >
                            <TriviaCard
                                question={trivia[activeTriviaIndex].question}
                                answer={trivia[activeTriviaIndex].answer}
                                onNext={handleNextTrivia}
                                index={activeTriviaIndex}
                            />
                        </motion.div>
                    </AnimatePresence>
                    <div className="flex justify-center gap-1.5 pt-1">
                        {trivia.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTriviaIndex(i)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-300",
                                    i === activeTriviaIndex ? "bg-[#d4af37] w-4" : "bg-black/15"
                                )}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Fun footer */}
            <div className="text-center py-2">
                <p className="text-xs text-gray-400 italic">Wishing Razia &amp; Abduraziq a lifetime of joy 🌿✨</p>
            </div>
        </div>
    );

}
