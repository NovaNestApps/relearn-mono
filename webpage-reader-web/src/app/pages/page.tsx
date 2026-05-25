"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PagesApi } from "@/hooks/useApi";
import type { PageItem } from "@/types";
import { routes } from "@/lib/routes";
import { featureFlags } from "@/lib/feature-flags";

function IconGlobe() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    );
}
function IconExternalLink() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
    );
}
function IconTrash() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    );
}
function IconBook() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
    );
}
function IconPlus() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
    );
}
function IconX() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PagesListPage() {
    const { user, ready, logout } = useAuth();
    const [pages, setPages] = useState<PageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ title: "", url: "", content: "" });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (!ready) return;
        if (!user) { window.location.href = routes.login; return; }
        PagesApi.list()
            .then(setPages)
            .catch((e) => setErr(e?.response?.data?.message || "Failed to load pages"))
            .finally(() => setLoading(false));
    }, [ready, user]);

    const addPage = async () => {
        if (!form.title.trim() || !form.url.trim()) return;
        try {
            setAdding(true);
            setErr(null);
            const created = await PagesApi.create({ title: form.title, url: form.url, content: form.content || undefined });
            setPages((p) => [created, ...p]);
            setShowAdd(false);
            setForm({ title: "", url: "", content: "" });
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setErr(err?.response?.data?.message || "Failed to add page");
        } finally {
            setAdding(false);
        }
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this page and all its summaries?")) return;
        await PagesApi.remove(id);
        setPages((p) => p.filter(x => x.id !== id));
    };

    if (!ready) return null;

    return (
        <div>
            {/* Toolbar row */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        {loading ? "—" : `${pages.length} page${pages.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdd((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
                    >
                        {showAdd ? <IconX /> : <IconPlus />}
                        {showAdd ? "Cancel" : "Add Page"}
                    </button>
                    <button
                        onClick={logout}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Error */}
            {err && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                    {err}
                </div>
            )}

            {/* Add form */}
            {showAdd && (
                <div className="card p-5 mb-5 grid gap-3">
                    <h3 className="text-sm font-semibold text-gray-700">New Page</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="label mb-1 block">Title</label>
                            <input
                                className="input"
                                placeholder="Page title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label mb-1 block">URL</label>
                            <input
                                className="input"
                                placeholder="https://..."
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label mb-1 block">Content <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea
                            className="input h-20 resize-none"
                            placeholder="Paste raw page content..."
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setShowAdd(false); setForm({ title: "", url: "", content: "" }); }}
                            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={addPage}
                            disabled={adding || !form.title.trim() || !form.url.trim()}
                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                        >
                            {adding ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="grid md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : pages.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="font-semibold text-gray-700 mb-1">No pages yet</p>
                    <p className="text-sm text-gray-400">Add a page above to get started.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-3">
                    {pages.map((p) => (
                        <div
                            key={p.id}
                            className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200 transition-all duration-150"
                        >
                            {/* Card header */}
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400">
                                    <IconGlobe />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate leading-snug">{p.title}</p>
                                    <a
                                        href={p.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-gray-400 truncate block hover:text-primary transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {p.url}
                                    </a>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    {p.createdAt && (
                                        <span>{formatDate(p.createdAt)}</span>
                                    )}
                                    {p.wordCount ? <span>{p.wordCount} words</span> : null}
                                    {p.readingTime ? <span>{p.readingTime} min</span> : null}
                                    {p.provider ? <span className="font-medium text-violet-400">{p.provider}</span> : null}
                                </div>
                                <div className="flex items-center gap-1">
                                    {featureFlags.adaptiveMemory && (
                                        <a
                                            href={routes.studyPage(p.id)}
                                            title="Study"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                                        >
                                            <IconBook />
                                        </a>
                                    )}
                                    <a
                                        href={routes.pageDetails(p.id)}
                                        title="Open"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                                    >
                                        <IconExternalLink />
                                    </a>
                                    <button
                                        onClick={() => remove(p.id)}
                                        title="Delete"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                    >
                                        <IconTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
