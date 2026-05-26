"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QuizzesApi } from "@/hooks/useApi";
import type { Quiz, QuizQuestion } from "@/types";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import clsx from "classnames";
import { routes } from "@/lib/routes";

type AnswerMap = Record<string, string | boolean | number>;
type ConfidenceMap = Record<string, number>;

export default function QuizPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <QuizPageContent />
        </Suspense>
    );
}

function QuizPageContent() {
    const { user, ready } = useAuth();
    const params = useSearchParams();
    const quizId = params.get("id");

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [confidence, setConfidence] = useState<ConfidenceMap>({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            window.location.href = routes.login;
            return;
        }
        if (!quizId) return;
        setLoadingQuiz(true);
        setLoadError(null);
        QuizzesApi.get(quizId)
            .then((nextQuiz) => {
                setQuiz(nextQuiz);
            })
            .catch(() => {
                setQuiz(null);
                setLoadError("Quiz not found");
            })
            .finally(() => setLoadingQuiz(false));
    }, [ready, user, quizId]);

    const current = useMemo(() => quiz?.questions[idx], [quiz, idx]);
    const total = quiz?.questions.length ?? 0;
    const progress = total ? ((idx + 1) / total) * 100 : 0;

    const selectAnswer = (question: QuizQuestion, value: string | boolean | number) => {
        setAnswers((state) => ({ ...state, [question.id]: value }));
    };

    const next = () => setIdx((i) => Math.min(i + 1, (quiz?.questions.length || 1) - 1));
    const prev = () => setIdx((i) => Math.max(i - 1, 0));

    const submit = async () => {
        if (!quiz || !quizId) return;

        setSubmitting(true);
        setSubmitted(true);
        setSubmitting(false);
    };

    const score = useMemo(() => {
        if (!quiz || !submitted) return 0;
        let result = 0;
        for (const question of quiz.questions) {
            const answer = answers[question.id];
            if (question.type === "mcq" && typeof answer === "string" && answer === question.answer) result += question.points ?? 1;
            if (question.type === "boolean" && typeof answer === "boolean" && answer === question.answer) result += question.points ?? 1;
            if (
                question.type === "short" &&
                typeof answer === "string" &&
                question.answer &&
                `${answer}`.trim().toLowerCase() === `${question.answer}`.trim().toLowerCase()
            ) {
                result += question.points ?? 1;
            }
        }
        return result;
    }, [quiz, answers, submitted]);

    if (!ready) return <div>Loading...</div>;
    if (!quizId) {
        return (
            <Card className="grid gap-3">
                <h2 className="text-xl font-bold">No quiz selected</h2>
                <p className="text-gray-600">Open a quiz from a saved page to start an attempt.</p>
                <a className="btn-secondary w-fit" href={routes.pages}>Back to Pages</a>
            </Card>
        );
    }
    if (loadingQuiz) return <div>Loading...</div>;
    if (!quiz) {
        return (
            <Card className="grid gap-3">
                <h2 className="text-xl font-bold">{loadError ?? "Quiz unavailable"}</h2>
                <p className="text-gray-600">The quiz could not be loaded.</p>
                <a className="btn-secondary w-fit" href={routes.pages}>Back to Pages</a>
            </Card>
        );
    }

    if (submitted) {
        const max = quiz.questions.reduce((acc, question) => acc + (question.points ?? 1), 0);
        return (
            <div className="grid gap-5">
                <a className="btn-secondary w-fit" href={routes.pageDetails(quiz.pageId)}>← Back to Page</a>
                <Card>
                    <h2 className="text-xl font-bold mb-2">{quiz.title}</h2>
                    <p className="text-gray-600 mb-4">{quiz.questions.length} questions</p>
                    <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Your Score</span>
                            <span className="font-bold">{score} / {max}</span>
                        </div>
                        <Progress value={(score / max) * 100} />
                    </div>
                </Card>

                <Card className="grid gap-4">
                    <h3 className="font-semibold">Review</h3>
                    {quiz.questions.map((question, index) => {
                        const correct = question.answer;
                        const given = answers[question.id];
                        const isCorrect =
                            (question.type === "mcq" && given === correct) ||
                            (question.type === "boolean" && given === correct) ||
                            (question.type === "short" && typeof given === "string" &&
                                `${given}`.trim().toLowerCase() === `${correct}`.trim().toLowerCase());

                        return (
                            <div key={question.id} className={clsx("border rounded-lg p-3", isCorrect ? "border-green-300" : "border-red-300")}>
                                <div className="font-medium">Q{index + 1}. {question.question}</div>
                                <div className="text-sm mt-1">Your answer: <b>{String(given ?? "—")}</b></div>
                                <div className="text-sm">Correct answer: <b>{String(correct ?? "—")}</b></div>
                                <div className="text-xs text-gray-500 mt-1">Confidence: {confidence[question.id] ?? 3}/5</div>
                                {question.explanation && <div className="text-xs text-gray-500 mt-1">{question.explanation}</div>}
                            </div>
                        );
                    })}
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="flex items-center justify-between">
                <a className="btn-secondary" href={routes.pageDetails(quiz.pageId)}>← Back to Page</a>
                <div className="text-sm text-gray-600">{idx + 1} / {total}</div>
            </div>

            <Card className="grid gap-4">
                <div>
                    <h2 className="text-xl font-bold">{quiz.title}</h2>
                    <p className="text-gray-600">{total} questions</p>
                    <div className="mt-3"><Progress value={progress} /></div>
                </div>

                {current && (
                    <div className="grid gap-3">
                        <div className="font-semibold">Q{idx + 1}. {current.question}</div>

                        {current.type === "mcq" && (
                            <div className="grid gap-2">
                                {current.options?.map((option) => {
                                    const active = answers[current.id] === option;
                                    return (
                                        <button
                                            key={option}
                                            className={clsx(
                                                "text-left border rounded-lg px-3 py-2 hover:bg-gray-50 transition",
                                                active && "border-primary bg-indigo-50"
                                            )}
                                            onClick={() => selectAnswer(current, option)}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {current.type === "boolean" && (
                            <div className="flex gap-2">
                                <button
                                    className={clsx("btn-secondary", answers[current.id] === true && "ring-2 ring-primary")}
                                    onClick={() => selectAnswer(current, true)}
                                >
                                    True
                                </button>
                                <button
                                    className={clsx("btn-secondary", answers[current.id] === false && "ring-2 ring-primary")}
                                    onClick={() => selectAnswer(current, false)}
                                >
                                    False
                                </button>
                            </div>
                        )}

                        {current.type === "short" && (
                            <input
                                className="input"
                                placeholder="Type your answer"
                                value={String(answers[current.id] ?? "")}
                                onChange={(e) => selectAnswer(current, e.target.value)}
                            />
                        )}

                        <div className="grid gap-2">
                            <div className="text-xs text-gray-600">Confidence (1-5)</div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        className={clsx("btn-secondary px-3", confidence[current.id] === value && "ring-2 ring-primary")}
                                        onClick={() => setConfidence((state) => ({ ...state, [current.id]: value }))}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2">
                    <button className="btn-secondary" onClick={prev} disabled={idx === 0}>Previous</button>
                    {idx < total - 1 ? (
                        <button className="btn-primary" onClick={next}>Next</button>
                    ) : (
                        <button className="btn-primary" onClick={submit} disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    )}
                </div>
            </Card>
        </div>
    );
}
