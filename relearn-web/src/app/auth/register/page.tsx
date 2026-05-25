"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";

export default function RegisterPage() {
    const { register } = useAuth();
    const [name, setName] = useState("");
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
            await register(email.trim(), password, name.trim() || undefined);
            window.location.href = routes.pages;
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto card p-6">
            <h2 className="text-xl font-bold mb-1">Create your account</h2>
            <p className="text-sm text-gray-600 mb-4">Start using Relearn</p>

            <form onSubmit={onSubmit} className="grid gap-3">
                <label className="label">Name (optional)</label>
                <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" />

                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" required />

                <label className="label">Password</label>
                <div className="relative">
                    <input
                        className="input pr-24"
                        type={show ? "text" : "password"}
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                    />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
                            onClick={()=>setShow(s=>!s)}>{show ? "Hide" : "Show"}</button>
                </div>

                {err && <div className="text-sm text-red-600">{err}</div>}

                <button className="btn-primary mt-2" disabled={loading}>
                    {loading ? "Creating..." : "Create account"}
                </button>
            </form>

            <div className="text-sm text-center mt-3">
                Already have an account? <a className="text-primary underline" href={routes.login}>Sign in</a>
            </div>
        </div>
    );
}
