'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const phrases = [
    'How can I help you today?',
    'Ask me anything...',
    'What would you like to know?',
    "Let's start a conversation",
    "I'm here to assist you",
];

export function TypewriterPhrases() {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentPhrase = phrases[currentPhraseIndex];
        const timeout = setTimeout(
            () => {
                if (!isDeleting) {
                    if (displayedText.length < currentPhrase.length) {
                        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
                    } else {
                        setTimeout(() => setIsDeleting(true), 2000);
                    }
                } else {
                    if (displayedText.length > 0) {
                        setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
                    } else {
                        setIsDeleting(false);
                        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
                    }
                }
            },
            isDeleting ? 50 : 50
        );

        return () => clearTimeout(timeout);
    }, [displayedText, isDeleting, currentPhraseIndex]);

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-2xl md:text-3xl font-medium text-center mb-8 h-12 flex items-center justify-center"
            >
                {displayedText}
                <span className="inline-block w-0.5 h-6 bg-foreground ml-1 animate-pulse" />
            </motion.div>
        </AnimatePresence>
    );
}
