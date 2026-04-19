
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle, Camera, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GamesViewProps {
    onSelectQuest: (questTag: string) => void;
    completedQuests: string[];
}

const quests = [
    { tag: 'best-dance-move', title: 'Catch the best dance move' },
    { tag: 'new-friend-selfie', title: 'A selfie with someone you just met' },
    { tag: 'sweetest-couple-moment', title: 'The sweetest couple moment (not the bride & groom!)' },
    { tag: 'cake-shot', title: 'A cool shot of the cake' },
    { tag: 'group-cheers', title: 'A group raising their glasses' },
    { tag: 'best-dressed-guest', title: 'The best dressed guest' },
];

const trivia = [
    {
        question: "Where did Razia & Abduraziq first meet?",
        answer: "At a quaint coffee shop, bonding over a shared love for artisanal coffee and bad puns."
    },
    {
        question: "Who said 'I love you' first?",
        answer: "Abduraziq, after a memorable home-cooked dinner by Razia (the way to his heart is through his stomach)."
    },
    {
        question: "What is their shared favorite binge-worthy TV show?",
        answer: "The Office. They've watched it through more times than they can count."
    },
];

const TriviaCard = ({ question, answer, onNext }: { question: string; answer: string; onNext: () => void }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(true);
        setTimeout(() => {
            onNext();
            setIsFlipped(false);
        }, 2500); // Wait 2.5s before going to next card
    };

    return (
        <div className="w-full h-48 [perspective:1000px]">
            <motion.div
                className="relative w-full h-full [transform-style:preserve-3d]"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
                {/* Front of card */}
                <div onClick={handleFlip} className="absolute w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-aurora-soft-gold to-[#d4af37] rounded-2xl p-6 flex flex-col justify-center items-center text-center text-black shadow-lg cursor-pointer">
                    <p className='font-medium text-lg'>{question}</p>
                    <p className="text-xs text-black/60 mt-2">Tap to reveal</p>
                </div>
                {/* Back of card */}
                <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#1C1C1C] text-white rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-lg">
                    <p className='text-base'>{answer}</p>
                </div>
            </motion.div>
        </div>
    );
};


export function GamesView({ onSelectQuest, completedQuests }: GamesViewProps) {
    const [activeTriviaIndex, setActiveTriviaIndex] = useState(0);

    const handleQuestClick = (tag: string) => {
        onSelectQuest(tag);
    };

    const handleNextTrivia = () => {
        setActiveTriviaIndex(prev => (prev + 1) % trivia.length);
    };

    return (
        <div className="p-4 space-y-8">
            <header className="text-center mb-6">
                <h1 className="font-headline text-3xl font-bold italic text-[#1C1C1C]">
                    Let's Play
                </h1>
                <p className="text-gray-500 tracking-wide mt-1">Join the fun and capture some memories.</p>
            </header>

            <Card className="bg-white/60 backdrop-blur-md border-black/10 shadow-lg">
                <CardHeader>
                    <CardTitle className='font-headline text-2xl italic text-[#d4af37]'>Photo Scavenger Hunt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {quests.map(quest => {
                        const isCompleted = completedQuests.includes(quest.tag);
                        return (
                            <motion.button
                                key={quest.tag}
                                onClick={() => !isCompleted && handleQuestClick(quest.tag)}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all",
                                    isCompleted ? "bg-green-100 text-gray-400" : "bg-white hover:bg-gray-50"
                                )}
                                whileTap={isCompleted ? {} : { scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <AnimatePresence>
                                        {isCompleted ? (
                                            <motion.div initial={{scale: 0}} animate={{scale: 1}} exit={{scale: 0}}>
                                                <CheckCircle className="text-green-500" />
                                            </motion.div>
                                        ) : (
                                            <Camera className="text-gray-400" />
                                        )}
                                    </AnimatePresence>
                                    <span className={cn("font-medium", isCompleted && "line-through")}>{quest.title}</span>
                                </div>
                                {!isCompleted && <ArrowRight className="text-gray-400" />}
                            </motion.button>
                        );
                    })}
                </CardContent>
            </Card>

             <Card className="bg-white/60 backdrop-blur-md border-black/10 shadow-lg">
                <CardHeader>
                    <CardTitle className='font-headline text-2xl italic text-[#d4af37]'>Couple's Trivia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AnimatePresence mode="wait">
                         <motion.div
                            key={activeTriviaIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                         >
                            <TriviaCard 
                                question={trivia[activeTriviaIndex].question}
                                answer={trivia[activeTriviaIndex].answer}
                                onNext={handleNextTrivia}
                            />
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}
