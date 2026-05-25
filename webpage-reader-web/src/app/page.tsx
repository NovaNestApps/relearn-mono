import { routes } from "@/lib/routes";

export default function HomePage() {
    return (
        <div className="grid gap-6">
            <section className="card p-6">
                <h2 className="text-xl font-bold mb-2">Welcome to Relearn</h2>
                <p className="text-gray-600">
                    Login, add pages, generate summaries, flashcards, quizzes, and track your learning memory over time.
                </p>
                <div className="mt-4 flex gap-3">
                    <a href={routes.login} className="btn-primary">Login</a>
                    <a href={routes.register} className="btn-secondary">Register</a>
                </div>
            </section>
        </div>
    );
}
