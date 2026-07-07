
'use client';

import type { JSX } from 'react';
import { motion } from 'framer-motion';

export const StaggeredText = ({ text, el: _El = 'h1', className }: { text: string, el?: keyof JSX.IntrinsicElements, className?: string }) => {
    const letters = Array.from(text);
    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.04, delayChildren: 0.04 * i },
        }),
    };
    const child = {
        visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 100 } },
        hidden: { opacity: 0, y: 20, transition: { type: 'spring', damping: 12, stiffness: 100 } },
    };

    return (
        <motion.div
            className={className}
            style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {letters.map((letter, index) => (
                <motion.span variants={child} key={index}>
                    {letter === ' ' ? '\u00A0' : letter}
                </motion.span>
            ))}
        </motion.div>
    );
};
