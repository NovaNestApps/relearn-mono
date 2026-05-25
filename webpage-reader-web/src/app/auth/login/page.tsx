"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await login(email.trim(), password);
            window.location.href = routes.pages;
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto grid gap-4">
            <div className="card p-6">
                <h2 className="text-xl font-bold mb-1">Welcome back</h2>
                <p className="text-sm text-gray-600 mb-4">Sign in to continue</p>

                <form onSubmit={onSubmit} className="grid gap-3">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />

                    <label className="label mt-2">Password</label>
                    <div className="relative">
                        <input
                            className="input pr-24"
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(e)=>setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
                                onClick={()=>setShow(s=>!s)}>{show ? "Hide" : "Show"}</button>
                    </div>

                    {err && <div className="text-sm text-red-600">{err}</div>}

                    <button className="btn-primary mt-2" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
            </div>

            <div className="text-sm text-center">
                New here? <a className="text-primary underline" href={routes.register}>Create an account</a>
            </div>
        </div>
    );
}
