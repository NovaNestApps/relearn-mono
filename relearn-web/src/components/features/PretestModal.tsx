'use client';

import { useState } from 'react';
import type { PretestQuestion } from '@/types';
import { PretestApi } from '@/hooks/useApi';

type Phase = 'before' | 'after';

type Props = {
    pageUrl: string;
    pageTitle: string;
    phase: Phase;
    onClose: () => void;
    onComplete?: (score: number, correct: boolean[]) => void;
};

type Step = 'loading' | 'quiz' | 'result';

export default function PretestModal({ pageUrl, pageTitle, phase, onClose, onComplete }: Props) {
    const [step, setStep] = useState<Step>('loading');
    const [pretestId, setPretestId] = useState<string>('');
    const [questions, setQuestions] = useState<PretestQuestion[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [current, setCurrent] = useState(0);
    const [result, setResult] = useState<{ score: number; correct: boolean[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const start = async () => {
        setError(null);
        try {
            const resp = await PretestApi.generate(pageUrl, pageTitle, phase);
            setPretestId(resp.pretestId);
            setQuestions(resp.questions);
            setSelected(new Array(resp.questions.length).fill(''));
            setCurrent(0);
            setStep('quiz');
        } catch {
            setError('Failed to generate questions. Try again.');
        }
    };

    const pick = (option: string) => {
        setSelected(prev => {
            const next = [...prev];
            next[current] = option;
            return next;
        });
    };

    const advance = () => {
        if (current < questions.length - 1) {
            setCurrent(c => c + 1);
        }
    };

    const submit = async () => {
        setError(null);
        try {
            const resp = await PretestApi.submit(pretestId, selected, phase);
            setResult(resp);
            setStep('result');
            onComplete?.(resp.score, resp.correct);
        } catch {
            setError('Failed to submit. Try again.');
        }
    };

    const isLast = current === questions.length - 1;
    const allAnswered = selected.every(s => s !== '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {phase === 'before' ? 'Pre-read Quiz' : 'Post-read Quiz'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                {step === 'loading' && (
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-6 text-sm">
                            {phase === 'before'
                                ? 'Answer 3 quick questions before reading to activate prior knowledge.'
                                : 'Test what you learned after reading.'}
                        </p>
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <button onClick={start} className="btn-primary px-6 py-2 rounded-lg">
                            Start Quiz
                        </button>
                    </div>
                )}

                {step === 'quiz' && questions.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Question {current + 1} / {questions.length}</p>
                        <p className="text-gray-800 font-medium mb-4">{questions[current].question}</p>
                        <div className="space-y-2 mb-6">
                            {questions[current].options.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => pick(opt)}
                                    className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition-colors ${
                                        selected[current] === opt
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                        <div className="flex justify-end gap-2">
                            {!isLast && (
                                <button
                                    onClick={advance}
                                    disabled={!selected[current]}
                                    className="btn-primary px-5 py-2 rounded-lg disabled:opacity-50"
                                >
                                    Next
                                </button>
                            )}
                            {isLast && (
                                <button
                                    onClick={submit}
                                    disabled={!allAnswered}
                                    className="btn-primary px-5 py-2 rounded-lg disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="text-center py-4">
                        <div className="text-4xl font-bold text-indigo-600 mb-2">
                            {Math.round(result.score * 100)}%
                        </div>
                        <p className="text-gray-500 text-sm mb-4">
                            {result.correct.filter(Boolean).length} / {result.correct.length} correct
                        </p>
                        <div className="flex justify-center gap-2 mb-6">
                            {result.correct.map((c, i) => (
                                <span
                                    key={i}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs text-white ${c ? 'bg-green-500' : 'bg-red-400'}`}
                                >
                                    {i + 1}
                                </span>
                            ))}
                        </div>
                        <button onClick={onClose} className="btn-primary px-6 py-2 rounded-lg">
                            {phase === 'before' ? 'Start Reading' : 'Done'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
